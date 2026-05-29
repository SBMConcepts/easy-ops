/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express'
import type { Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { hasRequiredRole } from '../lib/rbac.js'
import { ManagementClient } from 'auth0'

const router = Router()

router.post('/invite', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string | undefined
    if (!tenantSlug) {
      res.status(400).json({ error: 'Tenant workspace context missing.' })
      return
    }

    const authCtx = await verifyAuth0Token(req)
    if (!authCtx) {
      res.status(401).json({ error: 'Unauthorized security context.' })
      return
    }

    if (!hasRequiredRole(authCtx, 'manager')) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges to invite staff.' })
      return
    }

    const { email, full_name, role, department, site } = req.body as {
      email?: string
      full_name?: string
      role?: any
      department?: string | null
      site?: string | null
    }

    if (!email || !full_name || !role) {
      res.status(400).json({ error: 'Missing required fields: email, full_name, role' })
      return
    }

    const auth0 = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
      clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
    })

    const tokenRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
        client_secret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`Auth0 token fetch failed: ${err}`)
    }

    const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string }

    const inviteRes = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${authCtx.auth0TenantId}/invitations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviter: { name: 'Easy Ops' },
          invitee: { email: email.trim() },
          client_id: process.env.AUTH0_CLIENT_ID!,
          connection_id: process.env.AUTH0_DB_CONNECTION_ID!,
          ttl_sec: 604800,
          roles: [role],
          send_invitation_email: true,
        }),
      }
    )

    if (!inviteRes.ok) {
      const errBody = await inviteRes.json().catch(() => ({}))
      throw new Error(`Auth0 invitation failed: ${JSON.stringify(errBody)}`)
    }

    const newEmployee = await withTenantContext(
      authCtx.localTenantId,
      authCtx.localUserId,
      async (client) => {
        // Pre-provision / upsert local user
        const userRes = await client.query(
          `INSERT INTO public.users (id, auth0_user_id, email, full_name)
           VALUES (gen_random_uuid(), $1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id`,
          [`pending|${email.trim()}`, email.trim(), full_name.trim()]
        )

        const newUserId = userRes.rows[0].id

        await client.query(
          `INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
           VALUES ($1, $2, $3, 'invited')
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [authCtx.localTenantId, newUserId, role]
        )

        await client.query(
          `INSERT INTO public.employee_profiles (tenant_id, user_id, full_name, department, site)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             department = EXCLUDED.department,
             site = EXCLUDED.site`,
          [authCtx.localTenantId, newUserId, full_name.trim(), department ?? null, site ?? null]
        )

        return { id: newUserId, email, full_name, role, department, site }
      }
    )

    res.status(201).json(newEmployee)
  } catch (error: any) {
    console.error('Error inviting employee:', error)
    res.status(500).json({ error: error?.message || 'Failed to dispatch invitation.' })
  }
})

export default router

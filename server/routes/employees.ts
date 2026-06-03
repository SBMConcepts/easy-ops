import { Router, Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { hasRequiredRole } from '../lib/rbac.js'
import { ManagementClient } from 'auth0'

const router = Router()

router.post('/invite', async (req: Request, res: Response) => {
  try {
    const authCtx = await verifyAuth0Token(req)
    if (!authCtx || !authCtx.orgId) {
      return res.status(401).json({ error: 'Unauthorized security context.' })
    }

    if (!hasRequiredRole(authCtx, 'manager')) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' })
    }

    const { email, full_name, role, department, site } = req.body as {
      email?: string
      full_name?: string
      role?: 'admin' | 'manager' | 'supervisor' | 'employee'
      department?: string | null
      site?: string | null
    }

    if (!email || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields.' })
    }

    const auth0 = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
      clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
    })

    // 1. Dispatch official Auth0 Email Invitation bound to the current manager's orgId
    await auth0.organizations.invitations.create(authCtx.orgId, {
      inviter: { name: 'Your Organization' },
      invitee: { email: email.trim() },
      client_id: process.env.AUTH0_CLIENT_ID!,
      roles: role === 'admin' ? [process.env.AUTH0_ADMIN_ROLE_ID!] : [],
      send_invitation_email: true,
      app_metadata: { role, department, site },
    })

    // 2. Pre-stage the employee profile in Supabase so they show up in the UI immediately
    const result = await withTenantContext(authCtx, async (client) => {
      // Using the JWT context, we can safely write to the DB. RLS applies automatically.
      const userRes = await client.query(
        `INSERT INTO public.users (id, email, full_name, status)
         VALUES ($1, $2, $3, 'invited')
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [`pending|${email.trim()}`, email.trim(), full_name.trim()]
      )

      const newUserId = userRes.rows[0].id

      await client.query(
        `INSERT INTO public.memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, $3, 'invited')
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [authCtx.orgId, newUserId, role] // Note: Using orgId directly!
      )

      return { id: newUserId, email, full_name, role }
    })

    res.status(200).json({ success: true, employee: result })
  } catch (error: unknown) {
    console.error('Invite error:', (error as Error).message)
    res.status(500).json({ error: 'Internal server error during invitation.' })
  }
})

export default router

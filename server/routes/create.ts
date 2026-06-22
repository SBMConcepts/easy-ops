/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { ManagementClient } from 'auth0'
import { randomUUID } from 'crypto'
import type { Database } from '../types/supabase.js'
import { getPool } from '../lib/db.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

// Strongly typed from your database definitions
type Plan = Database['public']['Enums']['billing_plan']
const PLAN_VALUES: Plan[] = ['starter', 'growth', 'pro', 'enterprise']

// Ensure you use the Machine-to-Machine App credentials here
const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
})

router.post('/api/tenants/create', async (req: Request, res: Response): Promise<any> => {
  const { orgName, adminEmail, plan } = req.body as {
    orgName?: string
    adminEmail?: string
    plan?: Plan | string
  }

  if (!orgName || !adminEmail || !plan) {
    return res.status(400).json({ message: 'orgName, adminEmail, and plan are required.' })
  }

  const normalizedPlan = plan.toLowerCase() as Plan
  if (!PLAN_VALUES.includes(normalizedPlan)) {
    return res.status(400).json({ message: 'Invalid plan selected.' })
  }

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  if (!slug) {
    return res.status(400).json({ message: 'Invalid organization name.' })
  }

  const pool = getPool()
  let auth0OrgId: string | undefined
  try {
    // 1. Create the Auth0 Organization (SDK v4 syntax)
    const newOrg = await auth0.organizations.create({
      name: slug,
      display_name: orgName,
    })

    // Safely extract the ID supporting both SDK v3 and v4 wrapper
    auth0OrgId = newOrg.data?.id || newOrg.id

    if (!auth0OrgId) {
      throw new Error('Failed to retrieve Organization ID from Auth0.')
    }

    // 2. Provision Database Records
    const tenantId = randomUUID()
    const pendingUserId = `pending|${adminEmail.toLowerCase()}`

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // NOTE: `plan` is NOT a column on `tenants` (it lives on `subscriptions`).
      // The live tenants schema is: id, auth0_org_id, slug, name, status,
      // industry, country, logo_url, settings, created_at.
      await client.query(
        `INSERT INTO public.tenants (id, auth0_org_id, slug, name, status)
         VALUES ($1, $2, $3, $4, 'provisioning'::public.tenant_status)`,
        [tenantId, auth0OrgId, slug, orgName]
      )

      // Persist the selected plan on the subscriptions row. 'trialing' keeps the
      // plan visible via the tenant_active_plan view WITHOUT engaging the
      // seat-cap trigger (enforce_seat_cap only counts ACTIVE subscriptions).
      await client.query(
        `INSERT INTO public.subscriptions (tenant_id, plan, status)
         VALUES ($1, $2::public.billing_plan, 'trialing'::public.billing_status)
         ON CONFLICT (tenant_id) DO UPDATE SET plan = EXCLUDED.plan`,
        [tenantId, normalizedPlan]
      )

      await client.query(
        `INSERT INTO public.users (id, email, full_name, status)
         VALUES ($1, $2, 'Workspace Admin', 'active'::public.user_status)
         ON CONFLICT (email) DO NOTHING`,
        [pendingUserId, adminEmail.toLowerCase()]
      )

      // memberships.invited_by and memberships.joined_at are both NOT NULL with
      // no default (the BEFORE INSERT trigger handle_user_sync_from_jwt does NOT
      // populate them), so they MUST be supplied. This admin is self-provisioned
      // via a public endpoint, so invited_by references the pending admin itself.
      await client.query(
        `INSERT INTO public.memberships (tenant_id, user_id, role, status, invited_by, joined_at)
         VALUES ($1, $2, 'admin'::public.tenant_role, 'invited'::public.membership_status, $2, now())
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [tenantId, pendingUserId]
      )

      await client.query('COMMIT')
    } catch (provisionError: any) {
      await client.query('ROLLBACK').catch(() => null)

      // Cleanup: Delete from Supabase and Auth0 if DB insert fails
      await supabaseAdmin.from('tenants').delete().eq('id', tenantId)

      if (auth0OrgId) {
        await auth0.organizations.delete(auth0OrgId).catch(() => null)
      }

      throw new Error(`Admin provisioning failed: ${provisionError.message}`, {
        cause: provisionError,
      })
    } finally {
      client.release()
    }

    // 3. Send the Auth0 Invitation (SDK v4 syntax uses an object for the ID)
    await auth0.organizations.invitations.create(auth0OrgId, {
      inviter: { name: 'EasyOps Engine' },
      invitee: { email: adminEmail },
      client_id: process.env.AUTH0_CLIENT_ID!,
      // Only attach role ID if you have created roles in Auth0
      roles: process.env.AUTH0_ADMIN_ROLE_ID ? [process.env.AUTH0_ADMIN_ROLE_ID] : undefined,
      send_invitation_email: true,
      ttl_sec: 60 * 60 * 72,
      app_metadata: {
        role: 'admin',
        tenantId,
        auth0OrgId,
      },
    })

    return res.status(201).json({
      message: 'Tenant created and admin invited successfully.',
      tenantId,
      auth0OrgId,
    })
  } catch (error: any) {
    console.error('Error during tenant creation:', error)
    return res.status(500).json({ error: error.message || 'An unexpected error occurred.' })
  }
})

export default router

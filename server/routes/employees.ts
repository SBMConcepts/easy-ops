/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Response } from 'express'
import { AppRole } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { requireAuth0Org, requireRole, type AuthenticatedRequest } from '../lib/auth-middleware.js'
import { ManagementClient } from 'auth0'

const router = Router()

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
})

interface InviteStaffPayload {
  email?: string
  full_name?: string
  role?: AppRole
  departmentId?: string | null
  siteId?: string | null
}

router.post(
  '/api/employees/invite',
  requireAuth0Org,
  requireRole('manager'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!

      const { email, full_name, role, departmentId, siteId } = req.body as InviteStaffPayload

      if (!email || !full_name || !role) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const localProvisionResult = await withTenantContext(authCtx, async (client) => {
        // authCtx.orgId is the Auth0 org id (org_...). memberships.tenant_id and
        // employee_profiles.tenant_id are UUID FKs to tenants.id, so resolve the
        // internal tenant UUID first.
        const tenantRes = await client.query(
          `SELECT id FROM public.tenants WHERE auth0_org_id = $1 LIMIT 1`,
          [authCtx.orgId]
        )
        if (tenantRes.rows.length === 0) {
          throw new Error('Tenant not found for the authenticated organization.')
        }
        const tenantUuid = tenantRes.rows[0].id as string

        const userRes = await client.query(
          `INSERT INTO public.users (id, email, full_name, status)
         VALUES ('pending|' || $1, $1, $2, 'invited'::public.user_status)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
          [email.trim().toLowerCase(), full_name.trim()]
        )

        const newUserId = userRes.rows[0].id

        await client.query(
          `INSERT INTO public.memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, $3::public.tenant_role, 'invited'::public.membership_status)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [tenantUuid, newUserId, role]
        )

        await client.query(
          `INSERT INTO public.employee_profiles (id, tenant_id, membership_id, full_name, department_id, site_id)
         VALUES (gen_random_uuid(), $1, (SELECT id FROM public.memberships WHERE tenant_id = $1 AND user_id = $2), $3, $4, $5)
         ON CONFLICT (tenant_id, membership_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           department_id = EXCLUDED.department_id,
           site_id = EXCLUDED.site_id`,
          [tenantUuid, newUserId, full_name.trim(), departmentId, siteId]
        )

        return { id: newUserId }
      })

      await auth0.organizations.invitations.create(authCtx.orgId, {
        inviter: { name: authCtx.auth0UserId },
        invitee: { email: email.trim().toLowerCase() },
        client_id: process.env.AUTH0_CLIENT_ID!,
        send_invitation_email: true,
        app_metadata: { orgId: authCtx.orgId, role: role },
      })

      return res.status(201).json({ success: true, employeeId: localProvisionResult.id })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  }
)

export default router

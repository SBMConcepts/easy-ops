/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Response } from 'express'
import { withTenantContext } from '../lib/db.js'
import {
  requireAuth0Org,
  requirePermission,
  type AuthenticatedRequest,
} from '../lib/auth-middleware.js'
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
  role?: string
  departmentId?: string | null
  siteId?: string | null
}

router.post(
  '/api/employees/invite',
  requireAuth0Org,
  requirePermission('invite:members'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      const { email, full_name, role, departmentId, siteId } = req.body as InviteStaffPayload

      if (!email || !full_name || !role) {
        return res
          .status(400)
          .json({ error: 'Missing required invitation fields: email, full_name, or role.' })
      }

      const targetEmail = email.trim().toLowerCase()
      const newUserId = `pending|${targetEmail}` // Deterministic placeholder ID

      await withTenantContext(authCtx, async (client) => {
        const tenantRes = await client.query(
          `SELECT id FROM public.tenants WHERE auth0_org_id = $1`,
          [authCtx.orgId]
        )
        const tenantUuid = tenantRes.rows[0]?.id
        if (!tenantUuid)
          throw new Error('Target workspace configuration context could not be resolved.')

        // Create the shell user profile
        await client.query(
          `INSERT INTO public.users (id, email, full_name, status, created_at)
           VALUES ($1, $2, $3, 'active', NOW())
           ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name`,
          [newUserId, targetEmail, full_name.trim()]
        )

        // Associate with membership row
        await client.query(
          `INSERT INTO public.memberships (tenant_id, user_id, role, status, joined_at)
           VALUES ($1, $2, $3::public.tenant_role, 'invited'::public.membership_status, NOW())
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [tenantUuid, newUserId, role]
        )

        // Provision specific operational employee layout tracking metadata
        await client.query(
          `INSERT INTO public.employee_profiles (id, tenant_id, membership_id, full_name, department_id, site_id)
           VALUES (
             gen_random_uuid(), 
             $1, 
             (SELECT id FROM public.memberships WHERE tenant_id = $1 AND user_id = $2 LIMIT 1), 
             $3, $4, $5
           )
           ON CONFLICT (tenant_id, membership_id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             department_id = EXCLUDED.department_id,
             site_id = EXCLUDED.site_id`,
          [tenantUuid, newUserId, full_name.trim(), departmentId || null, siteId || null]
        )
      })

      // Dispatch invitation email via the Auth0 Organization API surface
      const invitation = await auth0.organizations.invitations.create(authCtx.orgId!, {
        inviter: { name: authCtx.auth0UserId || 'Workspace Admin' },
        invitee: { email: targetEmail },
        client_id: process.env.AUTH0_CLIENT_ID!,
        send_invitation_email: true,
        ttl_sec: 259200, // 3 days
        app_metadata: {
          role,
        },
      })

      return res.status(201).json({ success: true, invitationId: invitation.id, userId: newUserId })
    } catch (error: any) {
      console.error('Failed to create employee invitation package:', error)
      return res.status(500).json({ error: error.message })
    }
  }
)

export default router

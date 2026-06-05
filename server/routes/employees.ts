/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { hasRequiredRole } from '../lib/rbac.js'
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
  role?: 'manager' | 'supervisor' | 'employee'
  departmentId?: string | null
  siteId?: string | null
}

router.post('/api/employees/invite', async (req: Request, res: Response): Promise<any> => {
  try {
    const authCtx = await verifyAuth0Token(req)
    if (!authCtx || !authCtx.orgId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized security identity verification parameters.' })
    }

    if (!hasRequiredRole(authCtx, 'manager')) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Requesting context profile role tier cannot invite staff.' })
    }

    const { email, full_name, role, departmentId, siteId } = req.body as InviteStaffPayload

    if (!email || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields: email, full_name, role' })
    }

    // 1. Structure profile bindings utilizing stateless contextual orgId tokens directly
    const localProvisionResult = await withTenantContext(authCtx, async (client) => {
      const userRes = await client.query(
        `INSERT INTO public.users (id, email, full_name, status)
         VALUES ('pending|' || $1, $1, $2, 'invited')
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [email.trim().toLowerCase(), full_name.trim()]
      )

      const newUserId = userRes.rows[0].id

      await client.query(
        `INSERT INTO public.memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, $3::public.tenant_role, 'invited'::public.membership_status)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [authCtx.orgId, newUserId, role]
      )

      await client.query(
        `INSERT INTO public.employee_profiles (id, tenant_id, membership_id, full_name, department_id, site_id)
         VALUES (gen_random_uuid(), $1, (SELECT id FROM public.memberships WHERE tenant_id = $1 AND user_id = $2), $3, $4, $5)
         ON CONFLICT (tenant_id, membership_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           department_id = EXCLUDED.department_id,
           site_id = EXCLUDED.site_id`,
        [authCtx.orgId, newUserId, full_name.trim(), departmentId || null, siteId || null]
      )

      return { id: newUserId }
    })

    // 2. Dispatch onboarding links through Auth0's identity network bound strictly to the active organization
    await auth0.organizations.invitations.create(authCtx.orgId, {
      inviter: { name: authCtx.auth0UserId },
      invitee: { email: email.trim().toLowerCase() },
      client_id: process.env.AUTH0_CLIENT_ID!,
      send_invitation_email: true,
      app_metadata: {
        orgId: authCtx.orgId,
        role: role,
      },
    })

    return res.status(201).json({
      success: true,
      employeeId: localProvisionResult.id,
      message: 'Staff records successfully structured and user invitation pipeline triggered.',
    })
  } catch (error: any) {
    console.error('Error executing infrastructure provisioning workflow loop:', error)
    return res
      .status(500)
      .json({ error: error.message || 'Internal infrastructure operations failure.' })
  }
})

export default router

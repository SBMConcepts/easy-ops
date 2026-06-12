/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Response } from 'express'
import { AppRole } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { requireAuth0Org, requireRole, type AuthenticatedRequest } from '../lib/auth-middleware.js'

const router = Router()

interface AccessRequestPayload {
  requestId?: string
  assignedRole?: AppRole
}

// Lists the calling tenant's pending access requests. Resolves the Auth0 org
// id to the tenant UUID (target_tenant_id is a UUID FK, never the Auth0 org id)
// and returns only 'pending' rows so the admin queue stays focused.
router.get(
  '/api/access-requests',
  requireAuth0Org,
  requireRole('manager'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const authCtx = req.auth!

    try {
      const rows = await withTenantContext(authCtx, async (client) => {
        const tenant = await client.query(`SELECT id FROM public.tenants WHERE auth0_org_id = $1`, [
          authCtx.orgId,
        ])
        const tenantId = tenant.rows[0]?.id
        if (!tenantId) return []

        const result = await client.query(
          `SELECT id, requester_name, requester_email, email_domain, message,
                  status, target_tenant_id, decided_at, decided_by, created_at
             FROM public.access_requests
            WHERE target_tenant_id = $1::uuid
              AND status = 'pending'::public.access_request_status
            ORDER BY created_at DESC`,
          [tenantId]
        )
        return result.rows
      })

      return res.status(200).json({ requests: rows })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  }
)

router.post(
  '/api/access-requests/approve-and-invite',
  requireAuth0Org,
  requireRole('manager'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const authCtx = req.auth!

    const { requestId, assignedRole = 'employee' } = req.body as AccessRequestPayload

    if (!requestId) return res.status(400).json({ error: 'Missing requestId' })

    try {
      const queryResult = await withTenantContext(authCtx, async (client) => {
        const result = await client.query(
          `SELECT public.approve_access_request_and_invite($1::uuid, $2::public.tenant_role) AS success`,
          [requestId, assignedRole]
        )
        return result.rows[0]
      })

      return res.status(200).json({ success: true, data: queryResult })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  }
)

export default router

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

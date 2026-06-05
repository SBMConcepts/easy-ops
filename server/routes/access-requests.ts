/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { hasRequiredRole } from '../lib/rbac.js'

const router = Router()

interface AccessRequestPayload {
  requestId?: string
  assignedRole?: 'admin' | 'manager' | 'supervisor' | 'employee'
}

router.post(
  '/api/access-requests/approve-and-invite',
  async (req: Request, res: Response): Promise<any> => {
    const authCtx = await verifyAuth0Token(req)
    if (!authCtx || !authCtx.orgId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized security context token validation failure.' })
    }

    if (!hasRequiredRole(authCtx, 'manager')) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Insufficient execution profile permissions.' })
    }

    const { requestId, assignedRole = 'employee' } = req.body as AccessRequestPayload

    if (!requestId) {
      return res
        .status(400)
        .json({ error: 'Missing target validation payload property: requestId' })
    }

    try {
      // Session operations execute under explicit transaction RLS mirroring parameters
      const queryResult = await withTenantContext(authCtx, async (client) => {
        const result = await client.query(
          `SELECT public.approve_access_request_and_invite($1::uuid, $2::public.tenant_role) AS success`,
          [requestId, assignedRole]
        )
        return result.rows[0]
      })

      return res.status(200).json({
        success: true,
        message: 'Workspace registration application processed successfully.',
        data: queryResult,
      })
    } catch (error: any) {
      console.error('Failure executing structural membership transaction:', error)
      return res.status(500).json({ error: error.message || 'Database execution engine error.' })
    }
  }
)

export default router

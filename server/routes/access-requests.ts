import { Router, Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { hasRequiredRole } from '../lib/rbac.js'

const router = Router()

router.post('/approve-and-invite', async (req: Request, res: Response) => {
  const authCtx = await verifyAuth0Token(req)
  if (!authCtx || !authCtx.orgId) {
    return res.status(401).json({ error: 'Unauthorized security context.' })
  }

  if (!hasRequiredRole(authCtx, 'manager')) {
    return res
      .status(403)
      .json({ error: 'Forbidden: Insufficient privileges to approve requests.' })
  }

  const { requestId } = req.body as { requestId?: string }

  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' })
  }

  try {
    // Inject the simulated JWT payload for RLS via withTenantContext
    await withTenantContext(authCtx, async (client) => {
      // Because Postgres RLS checks auth.jwt(), this function call is now highly secure
      await client.query(
        `SELECT public.approve_access_request_and_invite($1::uuid, $2::tenant_role)`,
        [requestId, 'employee']
      )
    })

    res.status(200).json({ success: true })
  } catch (error: unknown) {
    console.error('Approval error:', (error as Error).message)
    res.status(500).json({ error: 'Failed to approve request.' })
  }
})

export default router

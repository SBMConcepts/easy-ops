/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express'
import type { Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { hasRequiredRole } from '../lib/rbac.js'

const router = Router()

router.post('/approve-and-invite', async (req: Request, res: Response) => {
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

  // Adjust this if your RBAC expects a different permission than manager
  if (!hasRequiredRole(authCtx, 'manager')) {
    res.status(403).json({ error: 'Forbidden: Insufficient privileges to approve requests.' })
    return
  }

  const { requestId, email } = req.body as {
    requestId?: string
    email?: string
  }

  if (!requestId) {
    res.status(400).json({ error: 'Missing requestId' })
    return
  }

  // email is currently unused by your RPC, but keeping it means the route
  // safely accepts the payload your client sends.
  void email

  try {
    await withTenantContext(authCtx.localTenantId, authCtx.localUserId, async (client) => {
      await client.query(
        `SELECT public.approve_access_request_and_invite($1::uuid, $2::tenant_role)`,
        [requestId, 'employee']
      )
    })

    res.json({ ok: true })
  } catch (err: any) {
    console.error('Failed to approve access request and invite:', err)
    res.status(500).json({
      error: err?.message ?? 'Internal server error approving request.',
    })
  }
})

export default router

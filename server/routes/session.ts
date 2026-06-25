// GET /api/session — lightweight session echo for the authenticated caller.
// Returns the verified token's identity + org claims without a DB round-trip.
import { Router, type Response } from 'express'

import { requireAuth, type AuthedRequest } from '../lib/auth-middleware.js'

const router = Router()

router.get('/api/session', requireAuth, (req: AuthedRequest, res: Response) => {
  const auth = req.auth!
  res.json({
    authenticated: true,
    sub: auth.sub,
    email: auth.email ?? null,
    org_id: auth.org_id ?? null,
    role: auth.role ?? null,
  })
})

export default router

// GET /api/supabase-token — returns the Supabase RLS JWT for the current user.
//
// On a Regular Web App (confidential client) the browser no longer holds the
// Auth0 ID token, so it cannot read the `supabase_jwt` claim directly. The
// "Mint Supabase Token" Post-Login Action injects that JWT as a namespaced ID
// token claim, which express-openid-connect persists in the session; this route
// hands it back to the browser so the Supabase client can attach it for RLS.
import { Router, type Response } from 'express'

import { requireAuth, type AuthedRequest } from '../lib/auth-middleware.js'
import { AUTH0_CLAIM_NS } from '../lib/auth.js'

const router = Router()

router.get('/api/supabase-token', requireAuth, (req: AuthedRequest, res: Response) => {
  const claims = (req.oidc?.idTokenClaims ?? {}) as Record<string, unknown>
  const token = claims[`${AUTH0_CLAIM_NS}supabase_jwt`] as string | undefined

  if (!token) {
    res.status(404).json({ error: 'No Supabase token available in session.' })
    return
  }
  res.json({ token })
})

export default router

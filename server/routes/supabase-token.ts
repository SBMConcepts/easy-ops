import { Router, type Response } from 'express'
import jwt from 'jsonwebtoken'

import { requireAuth, type AuthedRequest } from '../lib/auth-middleware.js'
import { AUTH0_CLAIM_NS } from '../lib/auth.js'
import { permissionsForRole } from '../lib/permissions.js'

const router = Router()

/**
 * True when the login-minted Supabase JWT already carries a `permissions` array.
 * Sessions established before the permissions rollout lack this claim, so those
 * tokens must be re-minted server-side or Supabase RLS (has_permission) denies
 * every authenticated read. Decode only — we trust our own session claim.
 */
function claimTokenHasPermissions(token: string): boolean {
  try {
    const decoded = jwt.decode(token)
    return (
      !!decoded &&
      typeof decoded === 'object' &&
      Array.isArray((decoded as Record<string, unknown>).permissions)
    )
  } catch {
    return false
  }
}

router.get('/api/supabase-token', requireAuth, (req: AuthedRequest, res: Response) => {
  const claims = (req.oidc?.idTokenClaims ?? {}) as Record<string, unknown>
  const claimToken = claims[`${AUTH0_CLAIM_NS}supabase_jwt`] as string | undefined

  // Prefer the login-minted claim, but only once it includes permissions.
  if (claimToken && claimTokenHasPermissions(claimToken)) {
    res.json({ token: claimToken })
    return
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  const sub = req.auth?.sub

  // Re-mint with permissions so pre-rollout sessions are not locked out of RLS.
  if (secret && sub) {
    const nowSec = Math.floor(Date.now() / 1000)
    const minted = jwt.sign(
      {
        sub,
        email: req.auth?.email ?? null,
        aud: 'authenticated',
        role: 'authenticated',
        org_id: req.auth?.org_id ?? null,
        user_role: req.auth?.role ?? null,
        permissions: permissionsForRole(req.auth?.role),
        iat: nowSec,
        exp: nowSec + 60 * 60,
      },
      secret,
      { algorithm: 'HS256' }
    )
    res.json({ token: minted })
    return
  }

  // Cannot re-mint (no signing secret) — fall back to the stale claim if any.
  if (claimToken) {
    res.json({ token: claimToken })
    return
  }

  res.status(404).json({ error: 'No Supabase token available in session.' })
})

export default router

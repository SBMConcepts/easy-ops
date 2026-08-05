import { Router, type Response } from 'express'
import jwt from 'jsonwebtoken'

import { requireAuth, type AuthedRequest } from '../lib/auth-middleware.js'
import { AUTH0_CLAIM_NS } from '../lib/auth.js'
import { permissionsForRole } from '../lib/permissions.js'

const router = Router()

/**
 * True when the login-minted Supabase JWT carries what RLS actually needs:
 * `org_id`/`sub` (auth0.current_role() looks the role up from org_members).
 * The token never carries a `permissions` claim — that was dropped from the
 * Post-Login Action to keep the ID token (and the session cookie it's stored
 * in) small; don't reintroduce that check here. Decode only — we trust our
 * own session claim.
 */
function claimTokenIsUsable(token: string): boolean {
  try {
    const decoded = jwt.decode(token)
    return (
      !!decoded &&
      typeof decoded === 'object' &&
      typeof (decoded as Record<string, unknown>).sub === 'string' &&
      typeof (decoded as Record<string, unknown>).org_id === 'string'
    )
  } catch {
    return false
  }
}

router.get('/api/supabase-token', requireAuth, (req: AuthedRequest, res: Response) => {
  const claims = (req.oidc?.idTokenClaims ?? {}) as Record<string, unknown>
  const claimToken = claims[`${AUTH0_CLAIM_NS}supabase_jwt`] as string | undefined

  // Prefer the login-minted claim, but only once it carries org_id/sub.
  if (claimToken && claimTokenIsUsable(claimToken)) {
    res.json({ token: claimToken })
    return
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  const sub = req.auth?.sub

  // Re-mint so pre-rollout sessions still carry org_id/sub — the only claims
  // auth0.current_role() actually reads to derive the role from org_members.
  if (secret && sub) {
    const nowSec = Math.floor(Date.now() / 1000)
    const minted = jwt.sign(
      {
        sub,
        email: req.auth?.email ?? null,
        aud: 'authenticated',
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

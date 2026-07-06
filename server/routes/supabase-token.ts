import { Router, type Response } from 'express'
import jwt from 'jsonwebtoken'

import { requireAuth, type AuthedRequest } from '../lib/auth-middleware.js'
import { AUTH0_CLAIM_NS } from '../lib/auth.js'
import { permissionsForRole } from '../lib/permissions.js'

const router = Router()

router.get('/api/supabase-token', requireAuth, (req: AuthedRequest, res: Response) => {
  const claims = (req.oidc?.idTokenClaims ?? {}) as Record<string, unknown>
  const token = claims[`${AUTH0_CLAIM_NS}supabase_jwt`] as string | undefined

  if (token) {
    res.json({ token })
    return
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  const sub = req.auth?.sub
  if (!secret || !sub) {
    res.status(404).json({ error: 'No Supabase token available in session.' })
    return
  }

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
})

export default router

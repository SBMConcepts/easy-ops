/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { getPool } from '../lib/db.js'

const router = Router()

interface AuthSyncPayload {
  auth0UserId?: string
  email?: string
  name?: string
  avatarUrl?: string | null
  emailVerified?: boolean
}

// POST /api/auth/sync
//
// Called by the Auth0 post-login and post-user-registration Actions to keep the
// public.users row in sync with the identity provider. Authenticated with a
// shared secret (x-api-key) rather than a user JWT, because Actions run in the
// Auth0 pipeline before a usable access token exists for the end user.
//
// Reconciliation: upsert keyed on email so a previously-invited row
// (id = 'pending|email', auth0_user_id empty) gets linked to the real Auth0
// identity on first login without orphaning its membership.
router.post('/api/auth/sync', async (req: Request, res: Response): Promise<any> => {
  const expectedSecret = process.env.AUTH0_SYNC_SECRET
  if (!expectedSecret) {
    console.error('AUTH0_SYNC_SECRET is not configured on the server.')
    return res.status(500).json({ error: 'Sync is not configured.' })
  }

  const providedSecret = req.header('x-api-key')
  if (!providedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  const { auth0UserId, email, name, avatarUrl } = req.body as AuthSyncPayload

  if (!auth0UserId || !email) {
    return res.status(400).json({ error: 'auth0UserId and email are required.' })
  }

  const pool = getPool()

  try {
    const result = await pool.query(
      `INSERT INTO public.users (id, auth0_user_id, email, full_name, avatar_url, status)
       VALUES ($1, $1, $2, $3, $4, 'active'::public.user_status)
       ON CONFLICT (email) DO UPDATE SET
         auth0_user_id = EXCLUDED.auth0_user_id,
         full_name = EXCLUDED.full_name,
         avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
         updated_at = now()
       RETURNING id, auth0_user_id, email`,
      [auth0UserId, email.trim().toLowerCase(), (name ?? email).trim(), avatarUrl ?? null]
    )

    return res.status(200).json({ success: true, user: result.rows[0] })
  } catch (error: any) {
    console.error('POST /api/auth/sync failed:', error)
    return res.status(500).json({ error: 'Failed to sync user.' })
  }
})

export default router

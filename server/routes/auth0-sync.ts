import { Router } from 'express'
import type { Request, Response } from 'express'
import { getPool } from '../lib/db.js'
import { timingSafeEqual } from 'crypto'
import crypto from 'crypto'

const router = Router()

function isAuthorised(req: Request): boolean {
  const secret = process.env.AUTH0_SYNC_SECRET
  if (!secret) {
    console.error('AUTH0_SYNC_SECRET is not configured')
    return false
  }
  const provided = req.headers['x-api-key']
  if (typeof provided !== 'string') return false

  const a = Buffer.from(secret)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}

/**
 * POST /api/auth/sync
 *
 * Called by an Auth0 post-login Action immediately after a successful login.
 * Safely upserts the user into the GLOBAL `users` table.
 */
router.post('/', async (req: Request, res: Response) => {
  if (!isAuthorised(req)) {
    res.status(401).json({ error: 'Unauthorized webhook payload' })
    return
  }

  const { auth0UserId, email, name, avatarUrl } = req.body

  if (!auth0UserId || !email) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    // Upsert the global user record.
    // If the user already exists, update their profile picture/name in case it changed in Auth0.
    await client.query(
      `INSERT INTO public.users (id, auth0_user_id, email, full_name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (auth0_user_id) DO UPDATE SET 
         email = EXCLUDED.email,
         full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
         updated_at = NOW()`,
      [crypto.randomUUID(), auth0UserId, email, name ?? email, avatarUrl || null]
    )

    res.status(200).json({ success: true })
  } catch (err: unknown) {
    console.error('Auth0 Sync database error:', err)
    res.status(500).json({ error: 'Database sync failed' })
  } finally {
    client.release()
  }
})

export default router

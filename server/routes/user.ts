import { Router } from 'express'
import type { Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { getPool } from '../lib/db.js'

const router = Router()

router.get('/me', async (req: Request, res: Response) => {
  const authCtx = await verifyAuth0Token(req)
  if (!authCtx) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    const result = await client.query(
      `SELECT
         u.id,
         u.auth0_user_id,
         u.email,
         u.full_name,
         u.avatar_url,
         m.role,
         m.tenant_id,
         m.status AS membership_status
       FROM public.users u
       JOIN public.memberships m ON m.user_id = u.id
       WHERE u.auth0_user_id = $1
         AND m.tenant_id = $2
       LIMIT 1`,
      [authCtx.auth0UserId, authCtx.localTenantId]
    )

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User profile not found in this workspace.' })
      return
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Error fetching user:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

export default router

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
    // Optimization: authCtx already contains the verified localTenantId mapped from the JWT org_id claim
    const userResult = await client.query(
      `
      SELECT 
        p.id as profile_id,
        p.full_name,
        p.email,
        p.avatar_url,
        ur.organisation_roles as role
      FROM public.profiles p
      LEFT JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE p.auth0_user_id = $1
      AND p.organisation_id = $2
      LIMIT 1
      `,
      [authCtx.auth0UserId, authCtx.localTenantId]
    )

    if (userResult.rowCount === 0) {
      res.status(404).json({ error: 'User profile not found in this workspace.' })
      return
    }

    res.json(userResult.rows[0])
  } catch (err) {
    console.error('Error fetching user:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

export default router

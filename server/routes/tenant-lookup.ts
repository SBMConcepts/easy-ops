import { Router, Request, Response } from 'express'
import { getPool } from '../lib/db.js'

const router = Router()

/**
 * GET /api/tenant-lookup?org_id=org_xxxxx
 * Public endpoint — no auth required. Looks up a tenant's branding/status by its Auth0 org_id.
 */
router.get('/', async (req: Request, res: Response) => {
  const orgId = (req.query.org_id as string | undefined)?.trim()

  if (!orgId) {
    return res.status(400).json({ error: 'org_id query parameter is required' })
  }

  const pool = getPool()
  try {
    const result = await pool.query(
      `SELECT id, name, auth0_org_id, logo_url, status
       FROM public.tenants
       WHERE auth0_org_id = $1
       LIMIT 1`,
      [orgId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found.' })
    }

    res.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Tenant lookup error:', (error as Error).message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

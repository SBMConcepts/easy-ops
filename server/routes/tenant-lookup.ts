import { Router } from 'express'
import type { Request, Response } from 'express'
import { getPool } from '../lib/db.js'

const router = Router()

/**
 * GET /api/tenant-lookup?org_id=org_xxxxx
 *
 * Public endpoint — no auth required.
 * Looks up a tenant by its Auth0 org_id.  The frontend can call this
 * after receiving the JWT (which contains org_id) to fetch supplemental
 * tenant data such as branding.  If you need to validate that a workspace
 * slug exists before login, pass ?slug=<slug> instead.
 */
router.get('/', async (req: Request, res: Response) => {
  const orgId = (req.query.org_id as string | undefined)?.trim()
  const slug = (req.query.slug as string | undefined)?.toLowerCase().trim()

  if (!orgId && !slug) {
    res.status(400).json({ error: 'org_id or slug query parameter is required' })
    return
  }

  const pool = getPool()
  try {
    const result = orgId
      ? await pool.query(
          `SELECT id, name, slug, auth0_org_id, logo_url, status
           FROM public.tenants
           WHERE auth0_org_id = $1
           LIMIT 1`,
          [orgId]
        )
      : await pool.query(
          `SELECT id, name, slug, auth0_org_id, logo_url, status
           FROM public.tenants
           WHERE slug = $1
           LIMIT 1`,
          [slug]
        )

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Workspace not found' })
      return
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Error in tenant-lookup:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Response } from 'express'
import { withTenantContext } from '../lib/db.js'
import { requireAuth0Auth, type AuthenticatedRequest } from '../lib/auth-middleware.js'

const router = Router()

// All endpoints require a verified Auth0 access token. Tenant scoping is
// enforced by Postgres RLS via withTenantContext (set_config of the JWT claims),
// so no explicit tenant_id filter is needed in these queries. The auth
// middleware is applied per-route (not via router.use) because this router is
// mounted at '/', where a router-level middleware would intercept every request.

// GET /api/sites — list the authenticated tenant's sites.
router.get(
  '/api/sites',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      const rows = await withTenantContext(authCtx, async (client) => {
        const result = await client.query(`SELECT * FROM public.sites ORDER BY name ASC`)
        return result.rows
      })
      return res.status(200).json(rows)
    } catch (error: any) {
      console.error('GET /api/sites failed:', error)
      return res.status(500).json({ error: 'Failed to load sites.' })
    }
  }
)

// GET /api/departments — list the authenticated tenant's departments.
router.get(
  '/api/departments',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      const rows = await withTenantContext(authCtx, async (client) => {
        const result = await client.query(`SELECT * FROM public.departments ORDER BY name ASC`)
        return result.rows
      })
      return res.status(200).json(rows)
    } catch (error: any) {
      console.error('GET /api/departments failed:', error)
      return res.status(500).json({ error: 'Failed to load departments.' })
    }
  }
)

export default router

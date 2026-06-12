/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Response } from 'express'
import { withTenantContext } from '../lib/db.js'
import {
  requireAuth0Auth,
  requirePermission,
  type AuthenticatedRequest,
} from '../lib/auth-middleware.js'

const router = Router()

// All endpoints require a verified Auth0 access token. Tenant scoping is
// enforced by Postgres RLS via withTenantContext (set_config of the JWT claims),
// so no explicit tenant_id filter is needed in these queries. The auth
// middleware is applied per-route (not via router.use) because this router is
// mounted at '/', where a router-level middleware would intercept every request.
//
// Capability gating: reads require the matching read:* permission (granted to
// every role), structural writes require manage:sites / manage:departments
// (manager+), and destructive site deletes require admin:tenant (admin/owner).

// GET /api/sites — list the authenticated tenant's sites.
router.get(
  '/api/sites',
  requireAuth0Auth,
  requirePermission('read:sites'),
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
  requirePermission('read:departments'),
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

// ── Write gating ─────────────────────────────────────────────────────────────
// Sites/departments are operational structure: create/update require
// manage:sites / manage:departments (manager+). Destructive site deletes
// cascade, so they require admin:tenant (admin/owner) only.

// POST /api/sites — create a site (manage:sites).
router.post(
  '/api/sites',
  requireAuth0Auth,
  requirePermission('manage:sites'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { name, address, latitude, longitude, geofence_radius_m } = req.body as {
        name?: string
        address?: string
        latitude?: number | null
        longitude?: number | null
        geofence_radius_m?: number
      }
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Site name is required.' })
      }
      const row = await withTenantContext(req.auth!, async (client) => {
        // tenant_id is supplied by the RLS default / set_config claims; we set it
        // explicitly from the JWT org to satisfy the NOT NULL column.
        const result = await client.query(
          `INSERT INTO public.sites (tenant_id, name, address, latitude, longitude, geofence_radius_m)
           SELECT t.id, $1, COALESCE($2, ''), $3, $4, COALESCE($5, 150)
             FROM public.tenants t
            WHERE t.auth0_org_id = $6
           RETURNING *`,
          [
            name.trim(),
            address ?? null,
            latitude ?? null,
            longitude ?? null,
            geofence_radius_m ?? null,
            req.auth!.orgId,
          ]
        )
        return result.rows[0]
      })
      return res.status(201).json(row)
    } catch (error: any) {
      console.error('POST /api/sites failed:', error)
      return res.status(500).json({ error: 'Failed to create site.' })
    }
  }
)

// PATCH /api/sites/:id — update a site (manage:sites).
router.patch(
  '/api/sites/:id',
  requireAuth0Auth,
  requirePermission('manage:sites'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params
      const { name, address, latitude, longitude, geofence_radius_m } = req.body as {
        name?: string
        address?: string
        latitude?: number | null
        longitude?: number | null
        geofence_radius_m?: number
      }
      const row = await withTenantContext(req.auth!, async (client) => {
        const result = await client.query(
          `UPDATE public.sites
              SET name = COALESCE($2, name),
                  address = COALESCE($3, address),
                  latitude = COALESCE($4, latitude),
                  longitude = COALESCE($5, longitude),
                  geofence_radius_m = COALESCE($6, geofence_radius_m),
                  updated_at = now()
            WHERE id = $1
           RETURNING *`,
          [
            id,
            name?.trim() ?? null,
            address ?? null,
            latitude ?? null,
            longitude ?? null,
            geofence_radius_m ?? null,
          ]
        )
        return result.rows[0] || null
      })
      if (!row) return res.status(404).json({ error: 'Site not found.' })
      return res.status(200).json(row)
    } catch (error: any) {
      console.error('PATCH /api/sites failed:', error)
      return res.status(500).json({ error: 'Failed to update site.' })
    }
  }
)

// DELETE /api/sites/:id — delete a site (admin:tenant; deletes cascade).
router.delete(
  '/api/sites/:id',
  requireAuth0Auth,
  requirePermission('admin:tenant'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params
      const deleted = await withTenantContext(req.auth!, async (client) => {
        const result = await client.query(`DELETE FROM public.sites WHERE id = $1 RETURNING id`, [
          id,
        ])
        return result.rows[0] || null
      })
      if (!deleted) return res.status(404).json({ error: 'Site not found.' })
      return res.status(204).send()
    } catch (error: any) {
      console.error('DELETE /api/sites failed:', error)
      return res.status(500).json({ error: 'Failed to delete site.' })
    }
  }
)

// POST /api/departments — create a department (manage:departments).
router.post(
  '/api/departments',
  requireAuth0Auth,
  requirePermission('manage:departments'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { name, site_id } = req.body as { name?: string; site_id?: string | null }
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Department name is required.' })
      }
      const row = await withTenantContext(req.auth!, async (client) => {
        const result = await client.query(
          `INSERT INTO public.departments (tenant_id, name, site_id)
           SELECT t.id, $1, $2
             FROM public.tenants t
            WHERE t.auth0_org_id = $3
           RETURNING *`,
          [name.trim(), site_id || null, req.auth!.orgId]
        )
        return result.rows[0]
      })
      return res.status(201).json(row)
    } catch (error: any) {
      console.error('POST /api/departments failed:', error)
      return res.status(500).json({ error: 'Failed to create department.' })
    }
  }
)

// PATCH /api/departments/:id — update a department (manage:departments).
router.patch(
  '/api/departments/:id',
  requireAuth0Auth,
  requirePermission('manage:departments'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params
      const { name, site_id } = req.body as { name?: string; site_id?: string | null }
      const row = await withTenantContext(req.auth!, async (client) => {
        const result = await client.query(
          `UPDATE public.departments
              SET name = COALESCE($2, name),
                  site_id = COALESCE($3, site_id),
                  updated_at = now()
            WHERE id = $1
           RETURNING *`,
          [id, name?.trim() ?? null, site_id ?? null]
        )
        return result.rows[0] || null
      })
      if (!row) return res.status(404).json({ error: 'Department not found.' })
      return res.status(200).json(row)
    } catch (error: any) {
      console.error('PATCH /api/departments failed:', error)
      return res.status(500).json({ error: 'Failed to update department.' })
    }
  }
)

// DELETE /api/departments/:id — delete a department (manage:departments).
router.delete(
  '/api/departments/:id',
  requireAuth0Auth,
  requirePermission('manage:departments'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params
      const deleted = await withTenantContext(req.auth!, async (client) => {
        const result = await client.query(
          `DELETE FROM public.departments WHERE id = $1 RETURNING id`,
          [id]
        )
        return result.rows[0] || null
      })
      if (!deleted) return res.status(404).json({ error: 'Department not found.' })
      return res.status(204).send()
    } catch (error: any) {
      console.error('DELETE /api/departments failed:', error)
      return res.status(500).json({ error: 'Failed to delete department.' })
    }
  }
)

export default router

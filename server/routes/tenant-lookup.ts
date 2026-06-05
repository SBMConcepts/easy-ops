/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { getPool } from '../lib/db.js'

const router = Router()

/**
 * GET /api/tenant-lookup?org_id=org_xxxxxx
 * Public branding fetch endpoint. Evaluates organizational health by ID before rendering authentication views.
 */
router.get('/api/tenant-lookup', async (req: Request, res: Response): Promise<any> => {
  const orgId = (req.query.org_id as string | undefined)?.trim()

  if (!orgId) {
    return res
      .status(400)
      .json({ error: 'Validation parameter error: org_id property must be provided.' })
  }

  const pool = getPool()

  try {
    // Lookup query matches explicitly against the immutable auth0_org_id string
    const result = await pool.query(
      `SELECT id, name, auth0_org_id, logo_url, status
       FROM public.tenants
       WHERE auth0_org_id = $1
       LIMIT 1`,
      [orgId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Target multi-tenant workspace entity matching criteria could not be found.',
      })
    }

    const tenant = result.rows[0]

    if (tenant.status === 'suspended' || tenant.status === 'archived') {
      return res.status(403).json({
        error: 'Access Denied: The requested corporate instance container is currently offline.',
      })
    }

    return res.status(200).json({
      id: tenant.id,
      name: tenant.name,
      auth0OrgId: tenant.auth0_org_id,
      logoUrl: tenant.logo_url,
      status: tenant.status,
    })
  } catch (error: any) {
    console.error('Failure processing database search lookup parameters:', error)
    return res.status(500).json({ error: 'Internal system search processor crash.' })
  }
})

export default router

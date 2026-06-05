/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { getPool } from '../lib/db.js'
import type { Database } from '../types/supabase.js'

const router = Router()

// Derive the tenant row type explicitly from the schema
type TenantRow = Database['public']['Tables']['tenants']['Row']

router.get('/api/tenant-lookup', async (req: Request, res: Response): Promise<any> => {
  const orgId = (req.query.org_id as string | undefined)?.trim()

  if (!orgId) return res.status(400).json({ error: 'org_id property must be provided.' })

  const pool = getPool()

  try {
    const result = await pool.query(
      `SELECT id, name, auth0_org_id, logo_url, status
       FROM public.tenants
       WHERE auth0_org_id = $1
       LIMIT 1`,
      [orgId]
    )

    if (result.rowCount === 0) return res.status(404).json({ error: 'Workspace not found.' })

    const tenant = result.rows[0] as TenantRow

    if (tenant.status === 'suspended' || tenant.status === 'archived') {
      return res.status(403).json({ error: 'Workspace is offline.' })
    }

    return res.status(200).json({
      id: tenant.id,
      name: tenant.name,
      auth0OrgId: tenant.auth0_org_id,
      logoUrl: tenant.logo_url,
      status: tenant.status,
    })
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal system crash.' })
  }
})

export default router

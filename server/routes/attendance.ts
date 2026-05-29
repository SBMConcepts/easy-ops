import { Router } from 'express'
import type { Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'
import { hasRequiredRole } from '../lib/rbac.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const tenantSlug = req.headers['x-tenant-slug'] as string | undefined
  if (!tenantSlug) {
    res.status(400).json({ error: 'Tenant workspace context missing from routing.' })
    return
  }

  const authCtx = await verifyAuth0Token(req)
  if (!authCtx) {
    res.status(401).json({ error: 'Unauthorized security context.' })
    return
  }

  try {
    const records = await withTenantContext(
      authCtx.localTenantId,
      authCtx.localUserId,
      async (client) => {
        if (hasRequiredRole(authCtx, 'supervisor')) {
          const result = await client.query(
            `SELECT * 
             FROM public.attendance_records 
             ORDER BY date DESC, clock_in DESC`
          )
          return result.rows
        }

        const result = await client.query(
          `SELECT ar.* 
           FROM public.attendance_records ar
           JOIN public.employee_profiles ep ON ar.employee_profile_id = ep.id
           WHERE ep.user_id = $1
           ORDER BY ar.date DESC, ar.clock_in DESC`,
          [authCtx.localUserId]
        )

        return result.rows
      }
    )

    res.json(records)
  } catch (err) {
    console.error('Failed to fetch attendance records:', err)
    res.status(500).json({ error: 'Internal server error fetching attendance' })
  }
})

export default router

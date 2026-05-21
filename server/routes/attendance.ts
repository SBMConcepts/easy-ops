import { Router } from 'express'
import type { Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { withTenantContext } from '../lib/db.js'

const router = Router()

/**
 * GET /api/auth/attendance
 *
 * Security model:
 * 1. Verify the Auth0 JWT.
 * 2. Cross-check subdomain slug via middleware.
 * 3. `withTenantContext` automatically starts a transaction and injects RLS variables.
 * 4. Run the query — RLS enforces absolute isolation automatically.
 */
router.get('/', async (req: Request, res: Response) => {
  // ── 1. Tenant context (set by frontend from subdomain) ─────────────────
  const tenantSlug = req.headers['x-tenant-slug'] as string | undefined
  if (!tenantSlug) {
    res.status(400).json({ error: 'Tenant workspace context missing from routing.' })
    return
  }

  // ── 2. Verify Auth0 JWT & Resolve Database UUIDs ────────────────────────
  const authCtx = await verifyAuth0Token(req)
  if (!authCtx) {
    res.status(401).json({ error: 'Unauthorized security context.' })
    return
  }

  try {
    // ── 3. Execute Securely within Tenant Context ─────────────────────────
    const records = await withTenantContext(
      authCtx.localTenantId,
      authCtx.localUserId,
      async (client) => {
        // We don't need a WHERE clause; the database RLS handles it!
        const result = await client.query(
          `SELECT * FROM public.attendance_records ORDER BY date DESC, clock_in DESC`
        )
        return result.rows
      }
    )

    res.json(records)
  } catch (err: unknown) {
    console.error('Attendance fetch error:', err)
    res.status(500).json({ error: 'Database execution rejected.' })
  }
})

export default router

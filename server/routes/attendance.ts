import { Router } from 'express'
import type { Request, Response } from 'express'
import { verifyAuth0Token } from '../lib/auth.js'
import { getPool } from '../lib/db.js'

const router = Router()

/**
 * GET /api/auth/attendance
 *
 * Returns attendance records for the authenticated user's organisation.
 *
 * Security model:
 *  1. Verify the Auth0 JWT — extracts org_id + sub claims.
 *  2. Resolve the internal organisation UUID from auth0_org_id.
 *  3. Zero-trust cross-check: DB slug must match the x-tenant-slug header
 *     injected by the frontend (subdomain routing).
 *  4. Hydrate PostgreSQL session variables so RLS policies restrict rows
 *     to the current tenant and user without any application-level filtering.
 *  5. Run the query — RLS enforces isolation automatically.
 */
router.get('/', async (req: Request, res: Response) => {
  // ── 1. Tenant context (set by frontend from subdomain) ─────────────────
  const tenantSlug = req.headers['x-tenant-slug'] as string | undefined
  if (!tenantSlug) {
    res.status(400).json({ error: 'Tenant workspace context missing from routing.' })
    return
  }

  // ── 2. Verify Auth0 JWT ─────────────────────────────────────────────────
  const authCtx = await verifyAuth0Token(req)
  if (!authCtx) {
    res.status(401).json({ error: 'Unauthorized security context.' })
    return
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    // ── 3. Resolve organisation from DB using Auth0 org_id claim ──────────
    const tenantResult = await client.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM public.organisations WHERE auth0_org_id = $1 LIMIT 1`,
      [authCtx.auth0OrgId]
    )

    if (tenantResult.rows.length === 0) {
      res.status(404).json({ error: 'This organization is not registered in our system.' })
      return
    }

    const org = tenantResult.rows[0]

    // ── 4. Zero-trust cross-check ─────────────────────────────────────────
    // The JWT carries an org_id, and the request carries the subdomain slug.
    // Both must point to the same DB row — this prevents a token from one
    // tenant being used on another tenant's subdomain.
    if (org.slug !== tenantSlug) {
      res.status(403).json({
        error: 'Security Token Mismatch: Accessing this workspace with this token is prohibited.',
      })
      return
    }

    // ── 5. Resolve internal profile UUID from Auth0 sub ───────────────────
    // user_roles uses the profiles.id UUID (not the Auth0 sub) so we must
    // resolve it before setting the RLS session variable.
    const profileResult = await client.query<{ id: string }>(
      `SELECT id FROM public.profiles WHERE auth0_user_id = $1 LIMIT 1`,
      [authCtx.auth0UserId]
    )

    if (profileResult.rows.length === 0) {
      res.status(401).json({ error: 'User profile not found.' })
      return
    }

    const internalUserId = profileResult.rows[0].id

    // ── 6. Hydrate PostgreSQL session variables for RLS ───────────────────
    // Policies on attendance_records check:
    //   current_setting('app.current_tenant_id') and
    //   current_setting('app.current_user_id')
    await client.query(`SET LOCAL app.current_tenant_id = $1`, [org.id])
    await client.query(`SET LOCAL app.current_user_id = $1`, [internalUserId])

    // ── 7. Execute query — RLS restricts to the current tenant/user ───────
    const attendanceResult = await client.query(
      `SELECT * FROM public.attendance_records ORDER BY date DESC, clock_in DESC`
    )

    await client.query('COMMIT')

    res.json(attendanceResult.rows)
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    console.error('Attendance query error:', err)
    const msg = err instanceof Error ? err.message : 'Database execution rejected.'
    res.status(500).json({ error: msg })
  } finally {
    client.release()
  }
})

export default router

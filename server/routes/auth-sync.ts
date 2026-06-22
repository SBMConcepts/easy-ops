//server/routes/auth-sync.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { timingSafeEqual } from 'crypto'
import { getPool } from '../lib/db.js'

const router = Router()

interface AuthSyncPayload {
  auth0UserId?: string
  email?: string
  name?: string
  avatarUrl?: string
  emailVerified?: boolean
  role?: string
  orgId?: string // Auth0 Organization ID passed during login scope
}

const TENANT_ROLES = ['owner', 'admin', 'manager', 'supervisor', 'employee']

// Constant-time comparison of the inbound x-api-key against AUTH0_SYNC_SECRET.
// This endpoint is called by Auth0 Actions (post-login / post-registration),
// which present the shared secret as the `x-api-key` header. It is NOT
// JWT-protected, so the shared secret is the ONLY gate — never skip it.
function isAuthorizedSyncRequest(req: Request): boolean {
  const expected = process.env.AUTH0_SYNC_SECRET
  if (!expected) {
    console.error('AUTH0_SYNC_SECRET is not set — refusing all /api/auth/sync requests')
    return false
  }
  const provided = req.headers['x-api-key']
  if (typeof provided !== 'string' || provided.length === 0) return false

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

router.post('/api/auth/sync', async (req: Request, res: Response): Promise<any> => {
  if (!isAuthorizedSyncRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  const { auth0UserId, email, name, avatarUrl, role, orgId } = req.body as AuthSyncPayload

  if (!auth0UserId || !email) {
    return res.status(400).json({ error: 'Missing auth0UserId or email parameter.' })
  }

  const pool = getPool()
  const client = await pool.connect()
  const normalizedEmail = email.toLowerCase().trim()
  const fallbackName = name || 'Workspace User'

  try {
    // Reconciliation + profile sync run on a single dedicated client so that
    // BEGIN/COMMIT/ROLLBACK all execute on the same physical connection.
    await client.query('BEGIN')

    // 1. Check if user already exists by real Auth0 ID or placeholder
    const userCheck = await client.query(
      `SELECT id FROM public.users WHERE id = $1 OR email = $2 LIMIT 1`,
      [auth0UserId, normalizedEmail]
    )

    const finalUserId = auth0UserId

    if ((userCheck.rowCount ?? 0) > 0) {
      const existingUser = userCheck.rows[0]

      if (existingUser.id !== auth0UserId && existingUser.id.startsWith('pending|')) {
        // RECONCILIATION CASE: User was invited via email first.
        // Migrate their profile ID to the official Auth0 User ID.

        // Update foreign key references in memberships first to prevent FK failures
        await client.query(`UPDATE public.memberships SET user_id = $1 WHERE user_id = $2`, [
          auth0UserId,
          existingUser.id,
        ])

        // Update the primary key ID and profile data in public.users
        await client.query(
          `UPDATE public.users 
           SET id = $1, auth0_user_id = $1, full_name = $2, avatar_url = $3, status = 'active'
           WHERE id = $4`,
          [auth0UserId, fallbackName, avatarUrl || null, existingUser.id]
        )
      } else {
        // STANDARD UPDATE: User already exists with correct ID, sync fields
        await client.query(
          `UPDATE public.users 
           SET full_name = COALESCE($2, full_name), avatar_url = COALESCE($3, avatar_url)
           WHERE id = $1`,
          [auth0UserId, fallbackName, avatarUrl || null]
        )
      }
    } else {
      // FRESH PROVISION: No record exists yet (e.g. public sign-up flow)
      await client.query(
        `INSERT INTO public.users (id, auth0_user_id, email, full_name, avatar_url, status, created_at)
         VALUES ($1, $1, $2, $3, $4, 'active', NOW())`,
        [auth0UserId, normalizedEmail, fallbackName, avatarUrl || null]
      )
    }

    // 2. Resolve Active Membership, Tenant Role, and Capabilities. The org_id
    //    returned to the caller (and injected as the JWT claim) is the Auth0
    //    organization id (tenants.auth0_org_id) — the canonical tenant bridge
    //    consumed by current_tenant_id() (RLS) and resolveTenantId().
    const orgFilter = orgId?.trim() || ''

    const membershipRes = await client.query(
      `SELECT m.role, t.auth0_org_id AS org_id, t.name as tenant_name
       FROM public.memberships m
       JOIN public.tenants t ON t.id = m.tenant_id
       WHERE m.user_id = $1 
         AND m.status = 'active'::public.membership_status
         AND ($2 = '' OR t.auth0_org_id = $2)
       ORDER BY m.joined_at ASC NULLS LAST
       LIMIT 1`,
      [finalUserId, orgFilter]
    )

    // DB Role takes absolute precedence. Fall back to metadata rules only if new
    const hintRole = role && TENANT_ROLES.includes(role) ? role : undefined
    const resolvedRole = (membershipRes.rows[0]?.role as string) ?? hintRole ?? 'employee'
    const resolvedOrgId = (membershipRes.rows[0]?.org_id as string) ?? orgFilter ?? ''

    // 3. Fetch permissions from the source-of-truth configuration matrix
    let permissions: string[] = []
    if (TENANT_ROLES.includes(resolvedRole)) {
      const permsResult = await client.query(
        `SELECT permission FROM public.role_permissions
         WHERE role = $1::public.tenant_role
         ORDER BY permission`,
        [resolvedRole]
      )
      permissions = permsResult.rows.map((r) => r.permission as string)
    }

    await client.query('COMMIT')

    return res.status(200).json({
      success: true,
      role: resolvedRole,
      orgId: resolvedOrgId,
      permissions,
    })
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => null)
    console.error('Critical failure in /api/auth/sync payload ingestion:', error)
    return res.status(500).json({ error: error.message })
  } finally {
    client.release()
  }
})

export default router

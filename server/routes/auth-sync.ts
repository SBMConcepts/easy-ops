/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { getPool } from '../lib/db.js'

const router = Router()

interface AuthSyncPayload {
  auth0UserId?: string
  email?: string
  name?: string
  avatarUrl?: string | null
  emailVerified?: boolean
  role?: string
  // When the login is scoped to an Auth0 Organization, the Action passes its id
  // so the resolved role/permissions reflect the membership in THAT tenant.
  // Empty/absent means "use the user's first active membership".
  orgId?: string | null
}

// public.tenant_role enum — guards the role lookup against arbitrary input.
const TENANT_ROLES = ['owner', 'admin', 'manager', 'supervisor', 'employee']

// POST /api/auth/sync
//
// Called by the Auth0 post-login and post-user-registration Actions to keep the
// public.users row in sync with the identity provider. Authenticated with a
// shared secret (x-api-key) rather than a user JWT, because Actions run in the
// Auth0 pipeline before a usable access token exists for the end user.
//
// Reconciliation: upsert keyed on email so a previously-invited row
// (id = 'pending|email', auth0_user_id empty) gets linked to the real Auth0
// identity on first login without orphaning its membership.
router.post('/api/auth/sync', async (req: Request, res: Response): Promise<any> => {
  const expectedSecret = process.env.AUTH0_SYNC_SECRET
  if (!expectedSecret) {
    console.error('AUTH0_SYNC_SECRET is not configured on the server.')
    return res.status(500).json({ error: 'Sync is not configured.' })
  }

  const providedSecret = req.header('x-api-key')
  if (!providedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  const { auth0UserId, email, name, avatarUrl, role, orgId } = req.body as AuthSyncPayload

  if (!auth0UserId || !email) {
    return res.status(400).json({ error: 'auth0UserId and email are required.' })
  }

  const pool = getPool()

  try {
    const result = await pool.query(
      `INSERT INTO public.users (id, auth0_user_id, email, full_name, avatar_url, status)
       VALUES ($1, $1, $2, $3, $4, 'active'::public.user_status)
       ON CONFLICT (email) DO UPDATE SET
         auth0_user_id = EXCLUDED.auth0_user_id,
         full_name = EXCLUDED.full_name,
         avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
         updated_at = now()
       RETURNING id, auth0_user_id, email`,
      [auth0UserId, email.trim().toLowerCase(), (name ?? email).trim(), avatarUrl ?? null]
    )

    const userId = result.rows[0].id as string

    // Activate any membership left in the 'invited' state once the user has
    // authenticated for the first time. This covers both the tenant admin
    // (provisioned by POST /api/tenants/create) and invited employees
    // (provisioned by POST /api/employees/invite).
    await pool.query(
      `UPDATE public.memberships
          SET status = 'active'::public.membership_status,
              joined_at = COALESCE(joined_at, now()),
              updated_at = now()
        WHERE user_id = $1
          AND status = 'invited'::public.membership_status`,
      [userId]
    )

    // Resolve the AUTHORITATIVE role + tenant for this user from the database.
    // On a custom-database connection, app_metadata is not a reliable carrier of
    // the role on subsequent logins, so memberships.role is the source of truth.
    // Prefer the membership matching the login's organization when one was
    // supplied; otherwise take the first active membership (same ordering as
    // GET /api/userinfo).
    const orgFilter = (orgId ?? '').trim()
    const membershipRes = await pool.query(
      `SELECT m.role::text AS role, t.auth0_org_id AS org_id
         FROM public.memberships m
         JOIN public.tenants t ON t.id = m.tenant_id
        WHERE m.user_id = $1
          AND m.status = 'active'::public.membership_status
          AND ($2 = '' OR t.auth0_org_id = $2)
        ORDER BY m.joined_at ASC NULLS LAST
        LIMIT 1`,
      [userId, orgFilter]
    )

    // DB role wins; fall back to the hint the Action passed (app_metadata) only
    // when the user has no active membership yet, then to 'employee'.
    const hintRole = role && TENANT_ROLES.includes(role) ? role : undefined
    const resolvedRole = (membershipRes.rows[0]?.role as string) ?? hintRole ?? 'employee'
    const resolvedOrgId = (membershipRes.rows[0]?.org_id as string) ?? orgFilter ?? ''

    // Permissions for the resolved role, from the source-of-truth table. Returns
    // an empty list for unknown/absent roles rather than erroring.
    let permissions: string[] = []
    if (TENANT_ROLES.includes(resolvedRole)) {
      const permsResult = await pool.query(
        `SELECT permission FROM public.role_permissions
          WHERE role = $1::public.tenant_role
          ORDER BY permission`,
        [resolvedRole]
      )
      permissions = permsResult.rows.map((r) => r.permission as string)
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
      role: resolvedRole,
      orgId: resolvedOrgId,
      permissions,
    })
  } catch (error: any) {
    console.error('POST /api/auth/sync failed:', error)
    return res.status(500).json({ error: 'Failed to sync user.' })
  }
})

export default router

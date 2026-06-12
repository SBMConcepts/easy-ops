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

  const { auth0UserId, email, name, avatarUrl, role } = req.body as AuthSyncPayload

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

    // Resolve the permissions for the caller's role from the source-of-truth
    // table so the post-login Action can inject them as a token claim. Returns
    // an empty list for unknown/absent roles rather than erroring.
    let permissions: string[] = []
    if (role && TENANT_ROLES.includes(role)) {
      const permsResult = await pool.query(
        `SELECT permission FROM public.role_permissions
          WHERE role = $1::public.tenant_role
          ORDER BY permission`,
        [role]
      )
      permissions = permsResult.rows.map((r) => r.permission as string)
    }

    return res.status(200).json({ success: true, user: result.rows[0], permissions })
  } catch (error: any) {
    console.error('POST /api/auth/sync failed:', error)
    return res.status(500).json({ error: 'Failed to sync user.' })
  }
})

export default router

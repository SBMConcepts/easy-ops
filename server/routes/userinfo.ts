//server/routes/userinfo.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Response } from 'express'
import type { PoolClient } from 'pg'
import { withTenantContext } from '../lib/db.js'
import { requireAuth0Auth, type AuthenticatedRequest } from '../lib/auth-middleware.js'

const router = Router()

// Every endpoint in this router requires a verified Auth0 access token. The
// middleware is applied per-route (not via router.use) because this router is
// mounted at '/', where a router-level middleware would intercept every request
// that flows through the app — including unrelated public routes like /api/health.

// Canonical projection consumed by the frontend (CurrentUserProfile in
// src/hooks/useCurrentUser.ts and AuthContext). Joins the authenticated user to
// their active membership, owning tenant, and the tenant's active plan.
const PROFILE_SELECT = `
  SELECT
    u.id                  AS profile_id,
    u.auth0_user_id       AS auth0_user_id,
    u.email               AS email,
    u.full_name           AS full_name,
    u.avatar_url          AS avatar_url,
    u.status              AS user_status,
    m.tenant_id           AS tenant_id,
    m.role                AS role,
    m.status              AS membership_status,
    m.joined_at           AS joined_at,
    t.name                AS tenant_name,
    t.auth0_org_id        AS tenant_auth0_org,
    t.status              AS tenant_status,
    t.logo_url            AS tenant_logo,
    t.country             AS tenant_country,
    t.industry            AS tenant_industry,
    p.plan                AS plan,
    p.billing_status      AS billing_status,
    p.seat_cap            AS seat_cap,
    p.current_period_end  AS current_period_end,
    ep.site_id            AS assigned_site_id,
    ep.phone              AS phone,
    ep.address            AS address,
    ep.job_title          AS job_title
  FROM public.users u
  JOIN public.memberships m
    ON m.user_id = u.id
   AND m.status = 'active'::public.membership_status
  JOIN public.tenants t
    ON t.id = m.tenant_id
  LEFT JOIN public.tenant_active_plan p
    ON p.tenant_id = t.id
  LEFT JOIN public.employee_profiles ep
    ON ep.membership_id = m.id
  WHERE u.auth0_user_id = $1
    AND ($2 = '' OR t.auth0_org_id = $2)
  
  LIMIT 1
`

async function loadProfile(client: PoolClient, auth0UserId: string, orgId: string) {
  const result = await client.query(PROFILE_SELECT, [auth0UserId, orgId])
  return result.rows[0] || null
}

// Disambiguate why a profile failed to load so the caller (and logs) can tell
// "user not synced yet" from "user has no active membership in this org".
type ProfileMiss = 'no_user' | 'no_active_membership'

async function diagnoseMiss(
  client: PoolClient,
  auth0UserId: string,
  orgId: string
): Promise<ProfileMiss> {
  const userRes = await client.query(
    `SELECT 1 FROM public.users WHERE auth0_user_id = $1 LIMIT 1`,
    [auth0UserId]
  )
  if (userRes.rows.length === 0) return 'no_user'

  // The user row exists; the JOIN failed because no membership is active for
  // this user within the requesting organization.
  void orgId
  return 'no_active_membership'
}

// GET /api/userinfo — return the authenticated user's enriched profile.
router.get(
  '/api/userinfo',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!

      const profile = await withTenantContext(authCtx, (client) =>
        loadProfile(client, authCtx.auth0UserId, authCtx.orgId)
      )

      if (!profile) {
        const reason = await withTenantContext(authCtx, (client) =>
          diagnoseMiss(client, authCtx.auth0UserId, authCtx.orgId)
        )

        if (reason === 'no_active_membership') {
          return res.status(404).json({
            error:
              'Your account has no active membership in this organization. ' +
              'If you were just invited, finish accepting the invitation, then sign in again.',
            code: 'no_active_membership',
          })
        }

        return res.status(404).json({
          error: 'Profile not found for this account.',
          code: 'no_user',
        })
      }

      return res.status(200).json(profile)
    } catch (error: any) {
      console.error('GET /api/userinfo failed:', error)
      return res.status(500).json({ error: 'Failed to load profile.' })
    }
  }
)

// PUT /api/userinfo — update the authenticated user's own editable fields.
router.put(
  '/api/userinfo',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!

      const { full_name, avatar_url, phone, address, job_title } = req.body as {
        full_name?: string
        avatar_url?: string | null
        phone?: string | null
        address?: string | null
        job_title?: string | null
      }

      if (full_name !== undefined && full_name.trim().length === 0) {
        return res.status(400).json({ error: 'full_name cannot be empty.' })
      }

      const profile = await withTenantContext(authCtx, async (client) => {
        await client.query(
          `UPDATE public.users
            SET full_name = COALESCE($2, full_name),
                avatar_url = COALESCE($3, avatar_url),
                updated_at = now()
          WHERE auth0_user_id = $1`,
          [authCtx.auth0UserId, full_name?.trim() ?? null, avatar_url ?? null]
        )

        // Persist the profile-only fields onto the user's active membership's
        // employee_profiles row. Insert one if it does not yet exist so a fresh
        // member can save contact details before any profile row is created.
        if (phone !== undefined || address !== undefined || job_title !== undefined) {
          await client.query(
            `INSERT INTO public.employee_profiles (membership_id, tenant_id, phone, address, job_title)
             SELECT m.id, m.tenant_id, $2, $3, $4
               FROM public.memberships m
               JOIN public.users u ON u.id = m.user_id
              WHERE u.auth0_user_id = $1
                AND m.status = 'active'::public.membership_status
             ON CONFLICT (membership_id) DO UPDATE
                SET phone = COALESCE(EXCLUDED.phone, public.employee_profiles.phone),
                    address = COALESCE(EXCLUDED.address, public.employee_profiles.address),
                    job_title = COALESCE(EXCLUDED.job_title, public.employee_profiles.job_title),
                    updated_at = now()`,
            [authCtx.auth0UserId, phone ?? null, address ?? null, job_title ?? null]
          )
        }

        return loadProfile(client, authCtx.auth0UserId, authCtx.orgId)
      })

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found for this account.' })
      }

      return res.status(200).json(profile)
    } catch (error: any) {
      console.error('PUT /api/userinfo failed:', error)
      return res.status(500).json({ error: 'Failed to update profile.' })
    }
  }
)

export default router

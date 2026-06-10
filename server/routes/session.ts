/* eslint-disable @typescript-eslint/no-explicit-any */
// GET /api/session — the authenticated user's session summary: their
// memberships and the active membership for the token's organization. Mirrors
// the (now removed) TanStack `getMySession` server fn. The user row is linked
// from token claims on each call (idempotent, mirrors POST /api/auth/sync); the
// canonical activation of invited memberships still happens in /api/auth/sync.
import { Router, Response } from 'express'
import { withTenantContext } from '../lib/db.js'
import { requireAuth0Auth, type AuthenticatedRequest } from '../lib/auth-middleware.js'

const router = Router()

router.get(
  '/api/session',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!

      const result = await withTenantContext(authCtx, async (client) => {
        // Link the local user row to the Auth0 identity (keyed on email so a
        // previously-invited 'pending|email' row is upgraded, not duplicated).
        const email = (authCtx.email ?? '').toLowerCase().trim()
        if (email) {
          await client.query(
            `INSERT INTO public.users (id, auth0_user_id, email, full_name, avatar_url, status)
             VALUES ($1, $1, $2, $3, $4, 'active'::public.user_status)
             ON CONFLICT (email) DO UPDATE SET
               auth0_user_id = EXCLUDED.auth0_user_id,
               full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
               avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
               updated_at = now()`,
            [authCtx.auth0UserId, email, authCtx.name ?? email, authCtx.picture ?? null]
          )
        }

        // memberships.user_id references users.id (which may be 'pending|email'
        // or the Auth0 sub), so resolve via auth0_user_id rather than the sub.
        const membershipsRes = await client.query(
          `SELECT
             m.id            AS id,
             m.role          AS role,
             m.status        AS status,
             m.tenant_id     AS tenant_id,
             t.id            AS tenant__id,
             t.name          AS tenant__name,
             t.slug          AS tenant__slug,
             t.auth0_org_id  AS tenant__auth0_org_id,
             t.logo_url      AS tenant__logo_url,
             t.status        AS tenant__status
           FROM public.memberships m
           JOIN public.users u ON u.id = m.user_id
           JOIN public.tenants t ON t.id = m.tenant_id
           WHERE u.auth0_user_id = $1`,
          [authCtx.auth0UserId]
        )

        return membershipsRes.rows
      })

      const memberships = result.map((row: any) => ({
        id: row.id,
        role: row.role,
        status: row.status,
        tenant_id: row.tenant_id,
        tenants: {
          id: row.tenant__id,
          name: row.tenant__name,
          slug: row.tenant__slug,
          auth0_org_id: row.tenant__auth0_org_id,
          logo_url: row.tenant__logo_url,
          status: row.tenant__status,
        },
      }))

      const activeMembership = authCtx.orgId
        ? (memberships.find((m) => m.tenants.auth0_org_id === authCtx.orgId) ?? null)
        : null

      return res.status(200).json({
        userId: authCtx.auth0UserId,
        email: authCtx.email,
        orgId: authCtx.orgId || null,
        permissions: authCtx.permissions,
        roles: authCtx.role ? [authCtx.role] : [],
        memberships,
        activeMembership,
      })
    } catch (error: any) {
      console.error('GET /api/session failed:', error)
      return res.status(500).json({ error: 'Failed to load session.' })
    }
  }
)

export default router

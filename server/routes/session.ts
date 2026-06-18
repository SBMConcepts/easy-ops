//server/routes/session.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
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
      const email = (authCtx.email || '').toLowerCase().trim()

      if (!email) {
        return res
          .status(400)
          .json({ error: 'Invalid claims: Email address is missing from identity token.' })
      }

      const result = await withTenantContext(authCtx, async (client) => {
        // Safe check-and-insert profile boundary for resilience on client loads
        await client.query(
          `INSERT INTO public.users (id, auth0_user_id, email, full_name, status, created_at)
           VALUES ($1, $1, $2, $3, 'active', NOW())
           ON CONFLICT (email) DO UPDATE 
           SET auth0_user_id = EXCLUDED.auth0_user_id, id = EXCLUDED.id
           WHERE public.users.auth0_user_id IS NULL OR public.users.id LIKE 'pending|%'`,
          [authCtx.auth0UserId, email, authCtx.name || 'Workspace User']
        )

        // Select all active memberships for this authenticated operator
        const membershipsRes = await client.query(
          `SELECT 
             m.id, m.role, m.status, m.tenant_id,
             t.id            AS tenant__id,
             t.name          AS tenant__name,
             t.slug          AS tenant__slug,
             t.auth0_org_id  AS tenant__auth0_org_id,
             t.logo_url      AS tenant__logo_url,
             t.status        AS tenant__status
           FROM public.memberships m
           JOIN public.users u ON u.id = m.user_id
           JOIN public.tenants t ON t.id = m.tenant_id
           WHERE u.auth0_user_id = $1 AND m.status = 'active'::public.membership_status`,
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

      // Pin active workspace context matching the active Auth0 token's target organization
      const activeMembership = authCtx.orgId
        ? (memberships.find((m) => m.tenants.auth0_org_id === authCtx.orgId) ?? null)
        : null

      return res.status(200).json({
        userId: authCtx.auth0UserId,
        email: authCtx.email,
        orgId: authCtx.orgId,
        activeMembership,
        memberships,
      })
    } catch (error: any) {
      console.error('Session loading endpoint failed:', error)
      return res.status(500).json({ error: error.message })
    }
  }
)

export default router

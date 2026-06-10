/* eslint-disable @typescript-eslint/no-explicit-any */
// Tenant lifecycle for the authenticated user. Mirrors the (now removed)
// TanStack tenant server fns: GET lists the caller's active tenants; POST
// self-serve creates a tenant (Auth0 organization + Supabase rows) with the
// creator as the top-level member. The DB tenant_role enum has no 'owner', so
// the creator is provisioned as 'admin'.
import { Router, Response } from 'express'
import { getPool, withTenantContext } from '../lib/db.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { requireAuth0Auth, type AuthenticatedRequest } from '../lib/auth-middleware.js'
import * as mgmt from '../lib/auth0-management.js'

const router = Router()

const SLUG_RE = /^[a-z0-9-]+$/

// GET /api/tenants — the caller's active tenant memberships.
router.get(
  '/api/tenants',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      const rows = await withTenantContext(authCtx, async (client) => {
        // memberships.user_id = users.id, so resolve via auth0_user_id.
        const result = await client.query(
          `SELECT
             m.role          AS role,
             m.status        AS status,
             t.id            AS tenant__id,
             t.name          AS tenant__name,
             t.slug          AS tenant__slug,
             t.auth0_org_id  AS tenant__auth0_org_id,
             t.logo_url      AS tenant__logo_url
           FROM public.memberships m
           JOIN public.users u ON u.id = m.user_id
           JOIN public.tenants t ON t.id = m.tenant_id
           WHERE u.auth0_user_id = $1
             AND m.status = 'active'::public.membership_status`,
          [authCtx.auth0UserId]
        )
        return result.rows
      })

      const tenants = rows.map((row: any) => ({
        role: row.role,
        status: row.status,
        tenants: {
          id: row.tenant__id,
          name: row.tenant__name,
          slug: row.tenant__slug,
          auth0_org_id: row.tenant__auth0_org_id,
          logo_url: row.tenant__logo_url,
        },
      }))
      return res.status(200).json(tenants)
    } catch (error: any) {
      console.error('GET /api/tenants failed:', error)
      return res.status(400).json({ error: error.message })
    }
  }
)

// POST /api/tenants — self-serve tenant creation by the authenticated user.
router.post(
  '/api/tenants',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const authCtx = req.auth!
    const body = req.body as {
      name?: string
      slug?: string
      industry?: string
      country?: string
    }
    const name = body.name?.trim()
    const slug = body.slug?.trim().toLowerCase()

    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'name must be 2–100 characters.' })
    }
    if (!slug || slug.length < 2 || slug.length > 60 || !SLUG_RE.test(slug)) {
      return res
        .status(400)
        .json({ error: 'slug must be 2–60 chars: lowercase letters, numbers and hyphens.' })
    }

    let auth0OrgId: string | undefined
    try {
      // 1) Create the Auth0 organization (display name is the human label).
      const org = await mgmt.createOrganization({
        name: slug,
        display_name: name,
        metadata: { created_by: authCtx.auth0UserId },
      })
      auth0OrgId = org.id

      // 2) Insert the tenant row tied to the Auth0 org id.
      const { data: tenant, error: tenantErr } = await supabaseAdmin
        .from('tenants')
        .insert({
          name,
          slug,
          industry: body.industry?.trim() ?? null,
          country: body.country?.trim() ?? 'South Africa',
          auth0_org_id: org.id,
          status: 'active',
        })
        .select('id, name, slug, auth0_org_id')
        .single()
      if (tenantErr || !tenant) {
        await mgmt.deleteOrganization(org.id).catch(() => null)
        throw new Error(tenantErr?.message ?? 'Failed to create tenant.')
      }

      // 3) Add the creator to the Auth0 org with the top-level role (best-effort).
      try {
        await mgmt.addOrgMembers(org.id, [authCtx.auth0UserId])
        const adminRoleId = await mgmt.resolveRoleIdByName('admin')
        if (adminRoleId) {
          await mgmt.assignOrgMemberRoles(org.id, authCtx.auth0UserId, [adminRoleId])
        }
      } catch (e) {
        console.warn('[POST /api/tenants] Auth0 member assignment failed (continuing):', e)
      }

      // 4) Link the creator's user row and insert an active admin membership.
      // Raw SQL via the pool (the generated Supabase types are stricter than
      // the live DB for these enums/columns).
      const pool = getPool()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const email = (authCtx.email ?? '').toLowerCase().trim()
        const userRes = await client.query(
          `INSERT INTO public.users (id, auth0_user_id, email, full_name, status)
           VALUES ($1, $1, $2, $3, 'active'::public.user_status)
           ON CONFLICT (email) DO UPDATE SET
             auth0_user_id = EXCLUDED.auth0_user_id,
             updated_at = now()
           RETURNING id`,
          [
            authCtx.auth0UserId,
            email || `${authCtx.auth0UserId}@placeholder.local`,
            authCtx.name ?? email ?? authCtx.auth0UserId,
          ]
        )
        const userId = userRes.rows[0].id as string
        await client.query(
          `INSERT INTO public.memberships (tenant_id, user_id, role, status, invited_by, joined_at)
           VALUES ($1, $2, 'admin'::public.tenant_role, 'active'::public.membership_status, $2, now())
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET
             role = EXCLUDED.role, status = EXCLUDED.status`,
          [tenant.id, userId]
        )
        await client.query('COMMIT')
      } catch (memberErr: any) {
        await client.query('ROLLBACK').catch(() => null)
        console.warn('[POST /api/tenants] membership insert failed:', memberErr.message)
      } finally {
        client.release()
      }

      return res.status(201).json(tenant)
    } catch (error: any) {
      if (auth0OrgId) await mgmt.deleteOrganization(auth0OrgId).catch(() => null)
      console.error('POST /api/tenants failed:', error)
      return res.status(400).json({ error: error.message })
    }
  }
)

export default router

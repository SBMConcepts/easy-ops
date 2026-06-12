/* eslint-disable @typescript-eslint/no-explicit-any */
// Member management within the active tenant. Mirrors the (now removed)
// TanStack member server fns. Auth0 RBAC permissions gate each action; Supabase
// RLS re-checks. memberships.tenant_id is the internal tenant UUID, so the
// Auth0 org id from the token is resolved to that UUID first.
import { Router, Response } from 'express'
import { withTenantContext } from '../lib/db.js'
import {
  requireAuth0Auth,
  requirePermission,
  type AuthenticatedRequest,
} from '../lib/auth-middleware.js'
import type { AppRole } from '../lib/auth.js'
import * as mgmt from '../lib/auth0-management.js'

const router = Router()

// public.tenant_role enum (no 'owner' at the DB level).
const TENANT_ROLES: AppRole[] = ['admin', 'manager', 'supervisor', 'employee']
const isTenantRole = (v: unknown): v is AppRole =>
  typeof v === 'string' && (TENANT_ROLES as string[]).includes(v)

// Resolves the internal tenant UUID for the token's Auth0 org id.
async function resolveTenantId(client: any, orgId: string): Promise<string> {
  if (!orgId) throw new Error('No active organization in token')
  const result = await client.query(
    `SELECT id FROM public.tenants WHERE auth0_org_id = $1 LIMIT 1`,
    [orgId]
  )
  if (result.rows.length === 0) throw new Error(`No tenant mapped to Auth0 org ${orgId}`)
  return result.rows[0].id as string
}

// GET /api/members — list members of the active tenant.
router.get(
  '/api/members',
  requireAuth0Auth,
  requirePermission('read:members'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      const members = await withTenantContext(authCtx, async (client) => {
        const tenantId = await resolveTenantId(client, authCtx.orgId)
        const result = await client.query(
          `SELECT
             m.id          AS id,
             m.role        AS role,
             m.status      AS status,
             m.joined_at   AS joined_at,
             m.user_id     AS user_id,
             u.email       AS user__email,
             u.full_name   AS user__full_name,
             u.avatar_url  AS user__avatar_url
           FROM public.memberships m
           JOIN public.users u ON u.id = m.user_id
           WHERE m.tenant_id = $1
           ORDER BY m.joined_at DESC NULLS LAST`,
          [tenantId]
        )
        return result.rows.map((row: any) => ({
          id: row.id,
          role: row.role,
          status: row.status,
          joined_at: row.joined_at,
          user_id: row.user_id,
          users: {
            email: row.user__email,
            full_name: row.user__full_name,
            avatar_url: row.user__avatar_url,
          },
        }))
      })
      return res.status(200).json(members)
    } catch (error: any) {
      console.error('GET /api/members failed:', error)
      return res.status(400).json({ error: error.message })
    }
  }
)

// POST /api/members — invite a member to the active tenant.
router.post(
  '/api/members',
  requireAuth0Auth,
  requirePermission('invite:members'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      if (!authCtx.orgId) return res.status(400).json({ error: 'No active organization.' })

      const body = req.body as { email?: string; role?: string; name?: string }
      const email = body.email?.trim().toLowerCase()
      const role: AppRole = isTenantRole(body.role) ? body.role : 'employee'
      if (!email) return res.status(400).json({ error: 'email is required.' })
      if (body.role !== undefined && !isTenantRole(body.role)) {
        return res.status(400).json({ error: `role must be one of: ${TENANT_ROLES.join(', ')}` })
      }

      const tenantId = await withTenantContext(authCtx, async (client) => {
        const tid = await resolveTenantId(client, authCtx.orgId)
        const placeholderId = `pending|${email}`
        // Pending placeholder user + invited membership (raw SQL: the generated
        // Supabase types are stricter than the live DB for these enums/columns).
        await client.query(
          `INSERT INTO public.users (id, email, full_name, status)
           VALUES ($1, $2, $3, 'active'::public.user_status)
           ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name`,
          [placeholderId, email, body.name?.trim() ?? email]
        )
        await client.query(
          `INSERT INTO public.memberships (tenant_id, user_id, role, status, invited_by, joined_at)
           VALUES ($1, $2, $3::public.tenant_role, 'invited'::public.membership_status, $4, now())
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [tid, placeholderId, role, authCtx.auth0UserId]
        )
        return tid
      })

      // Create the Auth0 invitation (sends the email itself if configured).
      const clientId = process.env.AUTH0_CLIENT_ID
      if (!clientId) return res.status(500).json({ error: 'AUTH0_CLIENT_ID is not set.' })
      const roleId = await mgmt.resolveRoleIdByName(role)
      const inviterName = authCtx.name ?? authCtx.email ?? 'EasyOps admin'
      const invitation = await mgmt.createInvitation(authCtx.orgId, {
        inviter: { name: inviterName },
        invitee: { email },
        client_id: clientId,
        roles: roleId ? [roleId] : undefined,
        ttl_sec: 60 * 60 * 24 * 7,
        send_invitation_email: true,
        app_metadata: { tenant_id: tenantId, invited_by: authCtx.auth0UserId },
      })

      return res.status(201).json({
        invitationUrl: invitation.invitation_url,
        invitationId: invitation.id,
      })
    } catch (error: any) {
      console.error('POST /api/members failed:', error)
      return res.status(400).json({ error: error.message })
    }
  }
)

// PATCH /api/members/:id — change a member's role within the active tenant.
router.patch(
  '/api/members/:id',
  requireAuth0Auth,
  requirePermission('manage:roles'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      const membershipId = req.params.id
      const role = (req.body as { role?: string }).role
      if (!isTenantRole(role)) {
        return res.status(400).json({ error: `role must be one of: ${TENANT_ROLES.join(', ')}` })
      }

      const existing = await withTenantContext(authCtx, async (client) => {
        const tenantId = await resolveTenantId(client, authCtx.orgId)
        const result = await client.query(
          `SELECT id, user_id, role FROM public.memberships
           WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
          [membershipId, tenantId]
        )
        if (result.rows.length === 0) return null
        const row = result.rows[0]
        await client.query(
          `UPDATE public.memberships SET role = $2::public.tenant_role, updated_at = now()
           WHERE id = $1`,
          [row.id, role]
        )
        return row as { id: string; user_id: string; role: AppRole }
      })

      if (!existing) return res.status(404).json({ error: 'Membership not found.' })

      // Best-effort Auth0 role sync (only for already-linked, non-pending users).
      if (authCtx.orgId && !existing.user_id.startsWith('pending|')) {
        try {
          const [newRoleId, prevRoleId] = await Promise.all([
            mgmt.resolveRoleIdByName(role),
            mgmt.resolveRoleIdByName(existing.role),
          ])
          if (prevRoleId)
            await mgmt.removeOrgMemberRoles(authCtx.orgId, existing.user_id, [prevRoleId])
          if (newRoleId)
            await mgmt.assignOrgMemberRoles(authCtx.orgId, existing.user_id, [newRoleId])
        } catch (e) {
          console.warn('[PATCH /api/members] Auth0 role sync failed:', e)
        }
      }
      return res.status(200).json({ ok: true })
    } catch (error: any) {
      console.error('PATCH /api/members/:id failed:', error)
      return res.status(400).json({ error: error.message })
    }
  }
)

// DELETE /api/members/:id — offboard a member from the active tenant.
router.delete(
  '/api/members/:id',
  requireAuth0Auth,
  requirePermission('manage:members'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!
      const membershipId = req.params.id

      const existing = await withTenantContext(authCtx, async (client) => {
        const tenantId = await resolveTenantId(client, authCtx.orgId)
        const result = await client.query(
          `SELECT id, user_id, status FROM public.memberships
           WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
          [membershipId, tenantId]
        )
        if (result.rows.length === 0) return null
        const row = result.rows[0]
        await client.query(
          `UPDATE public.memberships
              SET status = 'offboarded'::public.membership_status, updated_at = now()
            WHERE id = $1`,
          [row.id]
        )
        return row as { id: string; user_id: string; status: string }
      })

      if (!existing) return res.status(404).json({ error: 'Membership not found.' })

      if (authCtx.orgId && !existing.user_id.startsWith('pending|')) {
        try {
          await mgmt.removeOrgMember(authCtx.orgId, existing.user_id)
        } catch (e) {
          console.warn('[DELETE /api/members] Auth0 removal failed:', e)
        }
      }
      return res.status(200).json({ ok: true })
    } catch (error: any) {
      console.error('DELETE /api/members/:id failed:', error)
      return res.status(400).json({ error: error.message })
    }
  }
)

export default router

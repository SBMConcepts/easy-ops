import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { isAccessRole } from '../lib/rbac.js'

const router = Router()

router.get(
  '/api/org-members',
  requireAuth,
  requireOrg,
  requireRole('member'),
  async (req: AuthedRequest, res: Response) => {
    // org_members is keyed by auth0_user_id (the Auth0 `sub`). There is NO FK
    // from org_members to users, so a PostgREST embed cannot be resolved — join
    // manually against users on auth0_user_id in two queries instead.
    const { data: memberRows, error } = await supabaseAdmin
      .from('org_members')
      .select('id, role, status, joined_at, auth0_user_id')
      .eq('auth0_org_id', req.orgId!)
      .order('joined_at', { ascending: true })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    const rows = memberRows ?? []
    const authUserIds = rows
      .map((m) => m.auth0_user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    const usersBySub = new Map<
      string,
      { id: string; email: string; full_name: string; avatar_url: string | null }
    >()
    if (authUserIds.length > 0) {
      const { data: users, error: usersErr } = await supabaseAdmin
        .from('users')
        .select('id, auth0_user_id, email, full_name, avatar_url')
        .in('auth0_user_id', authUserIds)
      if (usersErr) {
        res.status(500).json({ error: usersErr.message })
        return
      }
      for (const u of users ?? []) usersBySub.set(u.auth0_user_id, u)
    }

    const members = rows.map((m) => {
      const u = m.auth0_user_id ? (usersBySub.get(m.auth0_user_id) ?? null) : null
      return {
        id: m.id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        user_id: u?.id ?? null,
        users: u
          ? { id: u.id, email: u.email, full_name: u.full_name, avatar_url: u.avatar_url }
          : null,
      }
    })

    res.json({ members })
  }
)

router.post(
  '/api/org-members',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as { user_id?: string; role?: string }
    if (!body.user_id || !isAccessRole(body.role)) {
      res.status(400).json({ error: 'user_id and a valid access role are required.' })
      return
    }

    // The client identifies the member by users.id (UUID); org_members is keyed
    // by auth0_user_id, so resolve the Auth0 sub first.
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('auth0_user_id')
      .eq('id', body.user_id)
      .maybeSingle()

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('org_members')
      .update({ role: body.role })
      .eq('auth0_org_id', req.orgId!)
      .eq('auth0_user_id', targetUser.auth0_user_id)
      .select('id, role, status, auth0_user_id')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Membership not found in this organization.' })
      return
    }
    res.json({ id: data.id, role: data.role, status: data.status, user_id: body.user_id })
  }
)

router.delete(
  '/api/org-members/:id',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from('org_members')
      .delete()
      .eq('auth0_org_id', req.orgId!)
      .eq('id', String(req.params.id))

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(204).end()
  }
)

export default router

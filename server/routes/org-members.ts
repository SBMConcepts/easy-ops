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
    // org_members.user_id stores users.id (UUID). There is NO FK from
    // org_members to users in the DB, so a PostgREST embed (users(...)) cannot be
    // resolved — join manually in two queries instead.
    const { data: memberRows, error } = await supabaseAdmin
      .from('org_members')
      .select('id, role, status, joined_at, user_id')
      .eq('org_id', req.orgId!)
      .order('joined_at', { ascending: true })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    const rows = memberRows ?? []
    const userIds = rows
      .map((m) => m.user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    const usersById = new Map<
      string,
      { id: string; email: string; full_name: string; avatar_url: string | null }
    >()
    if (userIds.length > 0) {
      const { data: users, error: usersErr } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)
      if (usersErr) {
        res.status(500).json({ error: usersErr.message })
        return
      }
      for (const u of users ?? []) usersById.set(u.id, u)
    }

    const members = rows.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      user_id: m.user_id,
      users: m.user_id ? (usersById.get(m.user_id) ?? null) : null,
    }))

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

    const { data, error } = await supabaseAdmin
      .from('org_members')
      .update({ role: body.role })
      .eq('org_id', req.orgId!)
      .eq('user_id', body.user_id)
      .select('id, role, status, user_id')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Membership not found in this organization.' })
      return
    }
    res.json(data)
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
      .eq('org_id', req.orgId!)
      .eq('id', String(req.params.id))

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(204).end()
  }
)

export default router

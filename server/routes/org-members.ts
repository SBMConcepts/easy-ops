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
    const { data, error } = await supabaseAdmin
      .from('org_members')
      .select('id, role, status, joined_at, user_id, users(id, email, full_name, avatar_url)')
      .eq('org_id', req.orgId!)
      .order('joined_at', { ascending: true })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ members: data ?? [] })
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

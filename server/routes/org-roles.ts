import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { isAccessRole } from '../lib/rbac.js'

const router = Router()

router.get(
  '/api/org-roles',
  requireAuth,
  requireOrg,
  requirePermission('read:org_roles'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('org_roles')
      .select('id, name, base_role')
      .eq('auth0_org_id', req.orgId!)
      .order('name', { ascending: true })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ roles: data ?? [] })
  }
)

router.post(
  '/api/org-roles',
  requireAuth,
  requireOrg,
  requirePermission('write:org_roles'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as { name?: string; base_role?: string | null }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      res.status(400).json({ error: 'name is required.' })
      return
    }
    // base_role is optional; when present it maps this job title down to an
    // access tier and must be one of the known tiers.
    if (body.base_role != null && !isAccessRole(body.base_role)) {
      res.status(400).json({ error: 'base_role must be one of: owner, admin, manager, member.' })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('org_roles')
      .insert({ auth0_org_id: req.orgId!, name, base_role: body.base_role ?? null })
      .select('id, name, base_role')
      .single()
    if (error) {
      // 23505 = unique_violation on (auth0_org_id, lower(name)).
      if (error.code === '23505') {
        res.status(409).json({ error: 'A role with that name already exists.' })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json(data)
  }
)

router.delete(
  '/api/org-roles/:id',
  requireAuth,
  requireOrg,
  requirePermission('delete:org_roles'),
  async (req: AuthedRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from('org_roles')
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

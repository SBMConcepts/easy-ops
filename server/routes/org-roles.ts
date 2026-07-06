import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Database } from '../types/supabase.js'

type OrganizationRole = Database['public']['Enums']['organization_role']

const JOB_ROLES = new Set<OrganizationRole>(['owner', 'admin', 'manager', 'member'])

function isJobRole(value: unknown): value is OrganizationRole {
  return typeof value === 'string' && JOB_ROLES.has(value as OrganizationRole)
}

const router = Router()

router.get(
  '/api/org-roles',
  requireAuth,
  requireOrg,
  requireRole('member'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('org_roles')
      .select('id, name')
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
  requireRole('manager'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as { name?: string }
    if (!isJobRole(body.name)) {
      res.status(400).json({
        error: 'name must be one of: owner, admin, manager.',
      })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('org_roles')
      .insert({ auth0_org_id: req.orgId!, name: body.name })
      .select('id, name')
      .single()
    if (error) {
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
  requireRole('admin'),
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

import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

router.get(
  '/api/org-departments',
  requireAuth,
  requireOrg,
  requireRole('member'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('org_departments')
      .select('id, department_name, created_at')
      .eq('org_id', req.orgId!)
      .order('department_name', { ascending: true })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json((data ?? []).map((d) => ({ id: d.id, name: d.department_name, site_id: null })))
  }
)

router.post(
  '/api/org-departments',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as { name?: string }
    if (!body.name?.trim()) {
      res.status(400).json({ error: 'name is required.' })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('org_departments')
      .insert({ org_id: req.orgId!, department_name: body.name.trim() })
      .select('id, department_name')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json({ id: data.id, name: data.department_name, site_id: null })
  }
)

router.patch(
  '/api/org-departments/:id',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as { name?: string }
    if (!body.name?.trim()) {
      res.status(400).json({ error: 'name is required.' })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('org_departments')
      .update({ department_name: body.name.trim(), updated_at: new Date().toISOString() })
      .eq('org_id', req.orgId!)
      .eq('id', String(req.params.id))
      .select('id, department_name')
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Department not found.' })
      return
    }
    res.json({ id: data.id, name: data.department_name, site_id: null })
  }
)

router.delete(
  '/api/org-departments/:id',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from('org_departments')
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

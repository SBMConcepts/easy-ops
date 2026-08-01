import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { isAccessRole } from '../lib/rbac.js'
import type { Database, TablesUpdate } from '../types/supabase.js'

const router = Router()

router.get(
  '/api/org-members',
  requireAuth,
  requireOrg,
  requirePermission('read:org_members'),
  async (req: AuthedRequest, res: Response) => {
    // org_members is keyed by auth0_user_id (the Auth0 `sub`). There is NO FK
    // from org_members to users, so a PostgREST embed cannot be resolved — join
    // manually against users on auth0_user_id in two queries instead.
    const { data: memberRows, error } = await supabaseAdmin
      .from('org_members')
      .select(
        'id, auth0_org_id, role, status, joined_at, auth0_user_id, department_id, site_id, job_role_id, employee_code, manager_id, employment_type, shift_id'
      )
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
      {
        id: string
        auth0_user_id: string
        auth0_org_id: string
        email: string
        full_name: string
        avatar_url: string | null
      }
    >()
    if (authUserIds.length > 0) {
      const { data: users, error: usersErr } = await supabaseAdmin
        .from('users')
        .select('id, auth0_user_id, auth0_org_id, email, full_name, avatar_url')
        .in('auth0_user_id', authUserIds)
      if (usersErr) {
        res.status(500).json({ error: usersErr.message })
        return
      }
      for (const u of users ?? []) usersBySub.set(u.auth0_user_id, u)
    }

    // Resolve assignment labels (department / site / job title / shift) for
    // display. These are small per-org lookup tables, so fetch each once and
    // map by id.
    const [deptsRes, sitesRes, rolesRes, shiftsRes] = await Promise.all([
      supabaseAdmin
        .from('org_departments')
        .select('id, department_name')
        .eq('auth0_org_id', req.orgId!),
      supabaseAdmin.from('org_sites').select('id, site_name').eq('auth0_org_id', req.orgId!),
      supabaseAdmin.from('org_roles').select('id, name').eq('auth0_org_id', req.orgId!),
      supabaseAdmin.from('org_shifts').select('id, shift_name').eq('auth0_org_id', req.orgId!),
    ])
    const firstErr = deptsRes.error ?? sitesRes.error ?? rolesRes.error ?? shiftsRes.error
    if (firstErr) {
      res.status(500).json({ error: firstErr.message })
      return
    }
    const deptById = new Map((deptsRes.data ?? []).map((d) => [d.id, d.department_name]))
    const siteById = new Map((sitesRes.data ?? []).map((s) => [s.id, s.site_name]))
    const roleById = new Map((rolesRes.data ?? []).map((r) => [r.id, r.name]))
    const shiftById = new Map((shiftsRes.data ?? []).map((s) => [s.id, s.shift_name]))

    // Manager label resolves via the manager's own membership -> their user's
    // full name. Build a membership-id -> full-name map from the rows we have.
    const managerNameById = new Map<string, string>()
    for (const m of rows) {
      const u = m.auth0_user_id ? usersBySub.get(m.auth0_user_id) : undefined
      if (u) managerNameById.set(m.id, u.full_name)
    }

    const members = rows.map((m) => {
      const u = m.auth0_user_id ? (usersBySub.get(m.auth0_user_id) ?? null) : null
      return {
        id: m.id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        user_id: u?.id ?? null,
        department_id: m.department_id,
        department_name: m.department_id ? (deptById.get(m.department_id) ?? null) : null,
        site_id: m.site_id,
        site_name: m.site_id ? (siteById.get(m.site_id) ?? null) : null,
        job_role_id: m.job_role_id,
        job_role_name: m.job_role_id ? (roleById.get(m.job_role_id) ?? null) : null,
        employee_code: m.employee_code,
        employment_type: m.employment_type,
        shift_id: m.shift_id,
        shift_name: m.shift_id ? (shiftById.get(m.shift_id) ?? null) : null,
        manager_id: m.manager_id,
        manager_name: m.manager_id ? (managerNameById.get(m.manager_id) ?? null) : null,
        users: u
          ? {
              id: u.id,
              auth0_user_id: u.auth0_user_id,
              auth0_org_id: u.auth0_org_id,
              email: u.email,
              full_name: u.full_name,
              avatar_url: u.avatar_url,
            }
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
  requirePermission('write:org_members'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as {
      user_id?: string
      role?: string
      department_id?: string | null
      site_id?: string | null
      job_role_id?: string | null
      employee_code?: string | null
      manager_id?: string | null
      employment_type?: string | null
      shift_id?: string | null
    }
    if (!body.user_id) {
      res.status(400).json({ error: 'user_id is required.' })
      return
    }
    if (body.role !== undefined && !isAccessRole(body.role)) {
      res.status(400).json({ error: 'role must be a valid access role.' })
      return
    }

    const EMPLOYMENT_TYPES = ['permanent', 'contract', 'part_time', 'temporary', 'shift_worker']
    if (
      body.employment_type !== undefined &&
      body.employment_type !== null &&
      !EMPLOYMENT_TYPES.includes(body.employment_type)
    ) {
      res.status(400).json({ error: 'employment_type is not a valid value.' })
      return
    }

    // The client identifies the member by users.id (UUID); org_members is keyed
    // by auth0_user_id, so resolve the Auth0 sub first.
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('id, auth0_user_id, auth0_org_id')
      .eq('id', body.user_id)
      .eq('auth0_org_id', req.orgId!)
      .neq('auth0_user_id', req.auth?.sub || '') // ensure the user is not trying to add themselves
      .maybeSingle()

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' })
      return
    }

    // Build the update from the provided fields only. Department/site/job-title
    // references must belong to this org before they can be assigned; a null
    // value clears the assignment.
    const update: TablesUpdate<'org_members'> = {}
    if (body.role !== undefined) update.role = body.role

    const belongsToOrg = async (
      table: 'org_departments' | 'org_sites' | 'org_roles' | 'org_shifts',
      id: string
    ): Promise<boolean> => {
      const { data } = await supabaseAdmin
        .from(table)
        .select('id')
        .eq('auth0_org_id', req.orgId!)
        .eq('id', id)
        .maybeSingle()
      return Boolean(data)
    }

    if ('department_id' in body) {
      if (body.department_id && !(await belongsToOrg('org_departments', body.department_id))) {
        res.status(400).json({ error: 'department_id does not belong to this organization.' })
        return
      }
      update.department_id = body.department_id ?? null
    }
    if ('site_id' in body) {
      if (body.site_id && !(await belongsToOrg('org_sites', body.site_id))) {
        res.status(400).json({ error: 'site_id does not belong to this organization.' })
        return
      }
      update.site_id = body.site_id ?? null
    }
    if ('job_role_id' in body) {
      if (body.job_role_id && !(await belongsToOrg('org_roles', body.job_role_id))) {
        res.status(400).json({ error: 'job_role_id does not belong to this organization.' })
        return
      }
      update.job_role_id = body.job_role_id ?? null
    }
    if ('shift_id' in body) {
      if (body.shift_id && !(await belongsToOrg('org_shifts', body.shift_id))) {
        res.status(400).json({ error: 'shift_id does not belong to this organization.' })
        return
      }
      update.shift_id = body.shift_id ?? null
    }
    if ('employment_type' in body) {
      update.employment_type = (body.employment_type ?? null) as
        Database['public']['Enums']['employment_type'] | null
    }
    if ('employee_code' in body) {
      const code = typeof body.employee_code === 'string' ? body.employee_code.trim() : ''
      update.employee_code = code === '' ? null : code
    }
    if ('manager_id' in body) {
      if (body.manager_id) {
        // The manager must be an existing membership in this org and cannot be
        // the member themselves.
        const { data: managerRow } = await supabaseAdmin
          .from('org_members')
          .select('id, auth0_user_id')
          .eq('auth0_org_id', req.orgId!)
          .eq('id', body.manager_id)
          .maybeSingle()
        if (!managerRow) {
          res.status(400).json({ error: 'manager_id does not belong to this organization.' })
          return
        }
        if (managerRow.auth0_user_id === targetUser.auth0_user_id) {
          res.status(400).json({ error: 'A member cannot be their own manager.' })
          return
        }
      }
      update.manager_id = body.manager_id ?? null
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('org_members')
      .update(update)
      .eq('auth0_org_id', req.orgId!)
      .eq('auth0_user_id', targetUser.auth0_user_id)
      .select(
        'id, role, status, auth0_user_id, department_id, site_id, job_role_id, employee_code, manager_id, employment_type, shift_id'
      )
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'That employee code is already in use.' })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Membership not found in this organization.' })
      return
    }
    res.json({
      id: data.id,
      role: data.role,
      status: data.status,
      user_id: body.user_id,
      department_id: data.department_id,
      site_id: data.site_id,
      job_role_id: data.job_role_id,
      employee_code: data.employee_code,
      manager_id: data.manager_id,
      employment_type: data.employment_type,
      shift_id: data.shift_id,
    })
  }
)

router.delete(
  '/api/org-members/:id',
  requireAuth,
  requireOrg,
  requirePermission('delete:org_members'),
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

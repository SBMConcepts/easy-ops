import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { isAccessRole } from '../lib/rbac.js'
import { getAuth0OrgAdminRoleId, syncAuth0OrgAdminRole } from '../lib/auth0-admin.js'
import type { Database, TablesUpdate } from '../types/supabase.js'

const router = Router()

router.get(
  '/api/org-members',
  requireAuth,
  requireOrg,
  requirePermission('read:org_members'),
  async (req: AuthedRequest, res: Response) => {
    // org_members carries the membership + operational assignment; identity
    // fields email/avatar_url live only on `users` (keyed by auth0_user_id) and
    // must be joined in separately.
    const { data: memberRows, error } = await supabaseAdmin
      .from('org_members')
      .select(
        'id, auth0_org_id, auth0_user_id, role, status, joined_at, full_name, first_name, last_name, department_id, site_id, job_role_id, shift_id, manager_id, employee_code, employment_type, hourly_rate, tax_number'
      )
      .eq('auth0_org_id', req.orgId!)
      .order('joined_at', { ascending: true })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    const rows = memberRows ?? []
    const authUserIds = [...new Set(rows.map((m) => m.auth0_user_id))]

    // Resolve assignment labels (department / site / job title / shift) for
    // display. These are small per-org lookup tables, so fetch each once and
    // map by id.
    const [deptsRes, sitesRes, rolesRes, shiftsRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from('org_departments')
        .select('id, department_name')
        .eq('auth0_org_id', req.orgId!),
      supabaseAdmin.from('org_sites').select('id, site_name').eq('auth0_org_id', req.orgId!),
      supabaseAdmin.from('org_roles').select('id, name').eq('auth0_org_id', req.orgId!),
      supabaseAdmin.from('org_shifts').select('id, shift_name').eq('auth0_org_id', req.orgId!),
      authUserIds.length > 0
        ? supabaseAdmin
            .from('users')
            .select('auth0_user_id, email, avatar_url')
            .eq('auth0_org_id', req.orgId!)
            .in('auth0_user_id', authUserIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    const firstErr =
      deptsRes.error ?? sitesRes.error ?? rolesRes.error ?? shiftsRes.error ?? usersRes.error
    if (firstErr) {
      res.status(500).json({ error: firstErr.message })
      return
    }
    const deptById = new Map((deptsRes.data ?? []).map((d) => [d.id, d.department_name]))
    const siteById = new Map((sitesRes.data ?? []).map((s) => [s.id, s.site_name]))
    const roleById = new Map((rolesRes.data ?? []).map((r) => [r.id, r.name]))
    const shiftById = new Map((shiftsRes.data ?? []).map((s) => [s.id, s.shift_name]))
    const identityBySub = new Map(
      (usersRes.data ?? []).map((u) => [
        u.auth0_user_id,
        { email: u.email, avatar_url: u.avatar_url },
      ])
    )

    // Manager label resolves via the manager's own membership row -> their
    // full name. manager_id is the manager's auth0_user_id (managers are org
    // members too), so key this map the same way.
    const managerNameById = new Map<string, string>()
    for (const m of rows) managerNameById.set(m.auth0_user_id, m.full_name)

    const members = rows.map((m) => {
      const identity = identityBySub.get(m.auth0_user_id)
      return {
        id: m.id,
        auth0_org_id: m.auth0_org_id,
        auth0_user_id: m.auth0_user_id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        full_name: m.full_name,
        first_name: m.first_name,
        last_name: m.last_name,
        email: identity?.email ?? null,
        avatar_url: identity?.avatar_url ?? null,
        department_id: m.department_id,
        department_name: m.department_id ? (deptById.get(m.department_id) ?? null) : null,
        site_id: m.site_id,
        site_name: m.site_id ? (siteById.get(m.site_id) ?? null) : null,
        job_role_id: m.job_role_id,
        job_role_name: m.job_role_id ? (roleById.get(m.job_role_id) ?? null) : null,
        employee_code: m.employee_code,
        employment_type: m.employment_type,
        hourly_rate: m.hourly_rate,
        tax_number: m.tax_number,
        shift_id: m.shift_id,
        shift_name: m.shift_id ? (shiftById.get(m.shift_id) ?? null) : null,
        manager_id: m.manager_id,
        manager_name: m.manager_id ? (managerNameById.get(m.manager_id) ?? null) : null,
        // Legacy identity handle + nested object retained for older callers.
        user_id: m.auth0_user_id,
        users: {
          id: m.id,
          auth0_user_id: m.auth0_user_id,
          auth0_org_id: m.auth0_org_id,
          email: identity?.email ?? null,
          full_name: m.full_name,
          avatar_url: identity?.avatar_url ?? null,
        },
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
      auth0_user_id?: string
      role?: string
      full_name?: string
      first_name?: string
      last_name?: string
      department_id?: string | null
      site_id?: string | null
      job_role_id?: string | null
      employee_code?: string | null
      manager_id?: string | null
      employment_type?: string | null
      shift_id?: string | null
      hourly_rate?: number | null
      tax_number?: string | null
    }
    const targetSub = typeof body.auth0_user_id === 'string' ? body.auth0_user_id : ''
    if (!targetSub) {
      res.status(400).json({ error: 'auth0_user_id is required.' })
      return
    }
    if (body.role !== undefined && !isAccessRole(body.role)) {
      res.status(400).json({ error: 'role must be a valid access role.' })
      return
    }
    if (body.role !== undefined) {
      try {
        getAuth0OrgAdminRoleId()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Auth0 organization admin role is unavailable.'
        res.status(503).json({ error: message })
        return
      }
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

    // The member is identified by their Auth0 subject (auth0_user_id), which is
    // the key of org_members. Confirm the membership exists in this org and is
    // not the caller themselves before updating.
    const { data: targetUser } = await supabaseAdmin
      .from('org_members')
      .select('auth0_user_id, auth0_org_id')
      .eq('auth0_user_id', targetSub)
      .eq('auth0_org_id', req.orgId!)
      .neq('auth0_user_id', req.auth?.sub || '') // ensure the user is not trying to edit themselves
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
    if (typeof body.full_name === 'string') update.full_name = body.full_name
    if (typeof body.first_name === 'string') update.first_name = body.first_name
    if (typeof body.last_name === 'string') update.last_name = body.last_name
    if ('hourly_rate' in body) {
      const rate = body.hourly_rate
      update.hourly_rate = rate === null || rate === undefined ? null : Number(rate)
    }
    if ('tax_number' in body) {
      const tn = typeof body.tax_number === 'string' ? body.tax_number.trim() : ''
      update.tax_number = tn === '' ? null : tn
    }

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
        // manager_id is the manager's auth0_user_id: they must be an existing
        // membership in this org and cannot be the member themselves.
        if (body.manager_id === targetSub) {
          res.status(400).json({ error: 'A member cannot be their own manager.' })
          return
        }
        const { data: managerRow } = await supabaseAdmin
          .from('org_members')
          .select('auth0_user_id')
          .eq('auth0_org_id', req.orgId!)
          .eq('auth0_user_id', body.manager_id)
          .maybeSingle()
        if (!managerRow) {
          res.status(400).json({ error: 'manager_id does not belong to this organization.' })
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
      .eq('auth0_user_id', targetSub)
      .select(
        'id, role, status, auth0_user_id, full_name, first_name, last_name, department_id, site_id, job_role_id, employee_code, manager_id, employment_type, shift_id, hourly_rate, tax_number'
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
    if (body.role !== undefined) {
      try {
        await syncAuth0OrgAdminRole(req.orgId!, targetSub, data.role)
      } catch (err) {
        console.error('Auth0 organization role synchronization failed:', err)
        res.status(502).json({
          error:
            'The EasyOps role was updated, but Auth0 delegated administration could not be synchronized. Retry the update.',
        })
        return
      }
    }
    res.json({
      id: data.id,
      role: data.role,
      status: data.status,
      auth0_user_id: data.auth0_user_id,
      user_id: data.auth0_user_id,
      full_name: data.full_name,
      first_name: data.first_name,
      last_name: data.last_name,
      department_id: data.department_id,
      site_id: data.site_id,
      job_role_id: data.job_role_id,
      employee_code: data.employee_code,
      manager_id: data.manager_id,
      employment_type: data.employment_type,
      shift_id: data.shift_id,
      hourly_rate: data.hourly_rate,
      tax_number: data.tax_number,
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

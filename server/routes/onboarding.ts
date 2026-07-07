import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Json, TablesUpdate } from '../types/supabase.js'

const router = Router()

// Valid access tiers for org_roles.base_role (org_roles.name is free-form).
const JOB_ROLES = new Set(['owner', 'admin', 'manager', 'member'])

interface OnboardingBody {
  company?: { name?: string; country?: string; industry?: string }
  sites?: Array<{
    name?: string
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    geofence_radius_m?: number | null
  }>
  departments?: Array<{ name?: string; site_name?: string | null }>
  roles?: Array<{ name?: string; base_role?: string }>
  shifts?: unknown[]
  workRules?: Record<string, unknown>
  checkInMethods?: Record<string, unknown>
}

router.post(
  '/api/onboarding/complete',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as OnboardingBody

    try {
      const { data: currentOrg } = await supabaseAdmin
        .from('organizations')
        .select('metadata')
        .eq('auth0_org_id', orgId)
        .maybeSingle()

      const mergedMetadata = {
        ...((currentOrg?.metadata as Record<string, unknown> | null) ?? {}),
        workRules: body.workRules ?? {},
        checkInMethods: body.checkInMethods ?? {},
        shifts: body.shifts ?? [],
      }

      const orgUpdate: TablesUpdate<'organizations'> = {
        status: 'active',
        metadata: mergedMetadata as Json,
        updated_at: new Date().toISOString(),
      }
      if (body.company?.name) orgUpdate.name = body.company.name
      if (body.company?.country !== undefined) orgUpdate.country = body.company.country ?? ''
      if (body.company?.industry !== undefined) orgUpdate.industry = body.company.industry ?? ''

      const { error: orgErr } = await supabaseAdmin
        .from('organizations')
        .update(orgUpdate)
        .eq('auth0_org_id', orgId)
      if (orgErr) throw new Error(orgErr.message)

      const departmentRows = (body.departments ?? [])
        .filter((d) => d.name?.trim())
        .map((d) => ({ auth0_org_id: orgId, department_name: d.name!.trim() }))

      let firstDepartmentId: string | null = null
      if (departmentRows.length > 0) {
        const { data: depts, error: deptErr } = await supabaseAdmin
          .from('org_departments')
          .insert(departmentRows)
          .select('id')
        if (deptErr) throw new Error(deptErr.message)
        firstDepartmentId = depts?.[0]?.id ?? null
      }

      const siteInputs = (body.sites ?? []).filter((s) => s.name?.trim())
      if (siteInputs.length > 0) {
        if (!firstDepartmentId) {
          const { data: general } = await supabaseAdmin
            .from('org_departments')
            .insert({ auth0_org_id: orgId, department_name: 'General' })
            .select('id')
            .single()
          firstDepartmentId = general?.id ?? null
        }
        if (firstDepartmentId) {
          const siteRows = siteInputs.map((s) => ({
            auth0_org_id: orgId,
            site_name: s.name!.trim(),
            address: s.address ?? '',
            latitude: s.latitude ?? 0,
            longitude: s.longitude ?? 0,
            geo_radius: s.geofence_radius_m ?? 0,
            department_id: firstDepartmentId!,
          }))
          const { error: siteErr } = await supabaseAdmin.from('org_sites').insert(siteRows)
          if (siteErr) throw new Error(siteErr.message)
        }
      }

      // org_roles are free-form job titles. `name` is the title (kept as-is);
      // `base_role` optionally maps the title down to an access tier and must be
      // one of the known tiers when present.
      const seen = new Set<string>()
      const roleRows = (body.roles ?? [])
        .map((r) => {
          const name = typeof r.name === 'string' ? r.name.trim() : ''
          const base = typeof r.base_role === 'string' ? r.base_role.trim().toLowerCase() : ''
          return { name, base_role: JOB_ROLES.has(base) ? base : null }
        })
        .filter((r) => {
          if (!r.name) return false
          const key = r.name.toLowerCase()
          if (seen.has(key)) return false // matches the (auth0_org_id, lower(name)) unique index
          seen.add(key)
          return true
        })
      if (roleRows.length > 0) {
        const { error: roleErr } = await supabaseAdmin
          .from('org_roles')
          .insert(
            roleRows.map((r) => ({ auth0_org_id: orgId, name: r.name, base_role: r.base_role }))
          )
        if (roleErr) throw new Error(roleErr.message)
      }

      res.json({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onboarding failed.'
      console.error('onboarding/complete failed:', message)
      res.status(500).json({ error: message })
    }
  }
)

export default router

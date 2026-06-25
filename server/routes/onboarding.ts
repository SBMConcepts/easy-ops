// POST /api/onboarding/complete
//
// Finalizes organization onboarding: updates org profile, persists departments,
// sites, and job roles, and stores operational settings (work rules, check-in
// methods, shifts) in organizations.metadata (no dedicated tables exist for
// those in the schema). Admin+ only.
import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

// Valid organization_role enum values for org_roles.name.
const JOB_ROLES = new Set(['admin', 'manager', 'supervisor', 'employee', 'owner'])

interface OnboardingBody {
  company?: { name?: string; country?: string; industry?: string }
  sites?: Array<{
    name?: string
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    geofence_radius_m?: number | null
  }>
  departments?: Array<{ name?: string; site_id?: string | null }>
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
      // 1. Update organization profile + operational settings (metadata).
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

      const orgUpdate: Record<string, unknown> = {
        status: 'active',
        metadata: mergedMetadata,
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

      // 2. Departments.
      const departmentRows = (body.departments ?? [])
        .filter((d) => d.name?.trim())
        .map((d) => ({ org_id: orgId, department_name: d.name!.trim() }))

      let firstDepartmentId: string | null = null
      if (departmentRows.length > 0) {
        const { data: depts, error: deptErr } = await supabaseAdmin
          .from('org_departments')
          .insert(departmentRows)
          .select('id')
        if (deptErr) throw new Error(deptErr.message)
        firstDepartmentId = depts?.[0]?.id ?? null
      }

      // 3. Sites — require a department (NOT NULL). Attach to the first created
      //    department, provisioning a "General" department if none were given.
      const siteInputs = (body.sites ?? []).filter((s) => s.name?.trim())
      if (siteInputs.length > 0) {
        if (!firstDepartmentId) {
          const { data: general } = await supabaseAdmin
            .from('org_departments')
            .insert({ org_id: orgId, department_name: 'General' })
            .select('id')
            .single()
          firstDepartmentId = general?.id ?? null
        }
        if (firstDepartmentId) {
          const siteRows = siteInputs.map((s) => ({
            org_id: orgId,
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

      // 4. Job roles — only valid organization_role enum values are persisted.
      const roleNames = Array.from(
        new Set(
          (body.roles ?? [])
            .map((r) => (r.base_role ?? r.name ?? '').toLowerCase())
            .filter((name) => JOB_ROLES.has(name))
        )
      )
      if (roleNames.length > 0) {
        const roleRows = roleNames.map((name) => ({
          org_id: orgId,
          name: name as 'admin' | 'manager' | 'supervisor' | 'employee' | 'owner',
        }))
        const { error: roleErr } = await supabaseAdmin.from('org_roles').insert(roleRows)
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

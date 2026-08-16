import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { withDatabaseTransaction } from '../lib/database.js'
import type { Database } from '../types/supabase.js'

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
  shifts?: Array<{
    name?: string
    start_time?: string | null
    end_time?: string | null
    grace_period_minutes?: number | null
    weekly_hours?: number | null
  }>
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
      const completion = await withDatabaseTransaction(async (client) => {
        const organization = await client.query<{
          status: string
          metadata: Record<string, unknown> | null
        }>('SELECT status, metadata FROM public.organizations WHERE auth0_org_id = $1 FOR UPDATE', [
          orgId,
        ])
        const currentOrg = organization.rows[0]
        if (!currentOrg) throw new Error('Organization not found.')
        if (currentOrg.status === 'active') return { alreadyCompleted: true }

        const mergedMetadata = {
          ...(currentOrg.metadata ?? {}),
          workRules: body.workRules ?? {},
          checkInMethods: body.checkInMethods ?? {},
          shifts: body.shifts ?? [],
        }

        const departmentRows = (body.departments ?? [])
          .map((department) => department.name?.trim() ?? '')
          .filter(Boolean)

        let firstDepartmentId: string | null = null
        for (const departmentName of departmentRows) {
          const department = await client.query<{ id: string }>(
            'INSERT INTO public.org_departments (auth0_org_id, department_name) VALUES ($1, $2) RETURNING id',
            [orgId, departmentName]
          )
          firstDepartmentId ??= department.rows[0]?.id ?? null
        }

        const siteInputs = (body.sites ?? []).filter((site) => site.name?.trim())
        if (siteInputs.length > 0 && !firstDepartmentId) {
          const department = await client.query<{ id: string }>(
            "INSERT INTO public.org_departments (auth0_org_id, department_name) VALUES ($1, 'General') RETURNING id",
            [orgId]
          )
          firstDepartmentId = department.rows[0]?.id ?? null
        }
        if (firstDepartmentId) {
          for (const site of siteInputs) {
            await client.query(
              'INSERT INTO public.org_sites (auth0_org_id, site_name, address, latitude, longitude, geo_radius_m, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                orgId,
                site.name!.trim(),
                site.address ?? '',
                site.latitude ?? 0,
                site.longitude ?? 0,
                site.geofence_radius_m ?? 0,
                firstDepartmentId,
              ]
            )
          }
        }

        const seenRoles = new Set<string>()
        const roleRows = (body.roles ?? [])
          .map((role) => {
            const name = typeof role.name === 'string' ? role.name.trim() : ''
            const baseRole =
              typeof role.base_role === 'string' ? role.base_role.trim().toLowerCase() : ''
            return {
              name,
              baseRole: (JOB_ROLES.has(baseRole) ? baseRole : null) as
                Database['public']['Enums']['org_role'] | null,
            }
          })
          .filter((role) => {
            if (!role.name || seenRoles.has(role.name.toLowerCase())) return false
            seenRoles.add(role.name.toLowerCase())
            return true
          })
        for (const role of roleRows) {
          await client.query(
            'INSERT INTO public.org_roles (auth0_org_id, name, base_role) VALUES ($1, $2, $3)',
            [orgId, role.name, role.baseRole]
          )
        }

        const seenShifts = new Set<string>()
        const shiftRows = (body.shifts ?? [])
          .map((shift) => ({
            name: typeof shift.name === 'string' ? shift.name.trim() : '',
            startTime: shift.start_time ? String(shift.start_time) : '',
            endTime: shift.end_time ? String(shift.end_time) : '',
            gracePeriodMinutes:
              typeof shift.grace_period_minutes === 'number' ? shift.grace_period_minutes : 0,
            weeklyHours: typeof shift.weekly_hours === 'number' ? shift.weekly_hours : null,
          }))
          .filter((shift) => {
            if (!shift.name || !shift.startTime || !shift.endTime) return false
            if (seenShifts.has(shift.name.toLowerCase())) return false
            seenShifts.add(shift.name.toLowerCase())
            return true
          })
        for (const shift of shiftRows) {
          await client.query(
            'INSERT INTO public.org_shifts (auth0_org_id, shift_name, start_time, end_time, grace_period_minutes, weekly_hours) VALUES ($1, $2, $3, $4, $5, $6)',
            [
              orgId,
              shift.name,
              shift.startTime,
              shift.endTime,
              shift.gracePeriodMinutes,
              shift.weeklyHours,
            ]
          )
        }

        const companyName = body.company?.name?.trim() || null
        const country = body.company?.country ?? null
        const industry = body.company?.industry ?? null
        await client.query(
          "UPDATE public.organizations SET status = 'active', metadata = $2::jsonb, updated_at = now(), name = COALESCE($3, name), country = COALESCE($4, country), industry = COALESCE($5, industry) WHERE auth0_org_id = $1",
          [orgId, JSON.stringify(mergedMetadata), companyName, country, industry]
        )

        return { alreadyCompleted: false }
      })

      res.json({ ok: true, ...completion })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onboarding failed.'
      console.error('onboarding/complete failed:', message)
      res.status(500).json({ error: message })
    }
  }
)

export default router

/* eslint-disable @typescript-eslint/no-explicit-any */
// Workspace onboarding finalisation. Replaces the previous client-side direct
// Supabase writes in Onboarding.tsx with a single transactional, permission-
// gated endpoint. Every write is scoped to the tenant resolved from the
// caller's own Auth0 org claim, so an admin can only provision their own
// workspace. Raw SQL via the pool (the pool user bypasses RLS) mirrors the
// established provisioning pattern in create.ts.
import { Router, Response } from 'express'
import { getPool } from '../lib/db.js'
import {
  requireAuth0Org,
  requirePermission,
  type AuthenticatedRequest,
} from '../lib/auth-middleware.js'
import type { AppRole } from '../lib/auth.js'

const router = Router()

interface SiteInput {
  name?: string
  address?: string
  latitude?: string | number | null
  longitude?: string | number | null
  geofence_radius_m?: string | number | null
}
interface DepartmentInput {
  name?: string
  site_index?: number | null
}
interface RoleInput {
  name?: string
  base_role?: AppRole
}
interface ShiftInput {
  name?: string
  start_time?: string
  end_time?: string
  grace_period_minutes?: string | number | null
  site_index?: number | null
}
interface OnboardingPayload {
  company?: { name?: string; industry?: string; country?: string }
  sites?: SiteInput[]
  departments?: DepartmentInput[]
  roles?: RoleInput[]
  shifts?: ShiftInput[]
  workRules?: unknown
  checkInMethods?: unknown
}

const toFloat = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}
const toInt = (v: unknown, fallback: number): number => {
  if (v === null || v === undefined || v === '') return fallback
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return Number.isFinite(n) ? n : fallback
}

router.post(
  '/api/onboarding/complete',
  requireAuth0Org,
  requirePermission('admin:tenant'),
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const authCtx = req.auth!
    const body = (req.body ?? {}) as OnboardingPayload

    const companyName = body.company?.name?.trim()
    if (!companyName) {
      return res.status(400).json({ error: 'company.name is required.' })
    }

    const pool = getPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Resolve the caller's tenant from their Auth0 org claim — this is the
      // ONLY tenant they may provision.
      const tenantRes = await client.query(
        `SELECT id FROM public.tenants WHERE auth0_org_id = $1`,
        [authCtx.orgId]
      )
      const tenantId = tenantRes.rows[0]?.id as string | undefined
      if (!tenantId) {
        await client.query('ROLLBACK').catch(() => null)
        return res.status(404).json({ error: 'Tenant not found for the current organization.' })
      }

      // 1) Sites — insert in order so site_index maps deterministically to UUIDs.
      const siteIds: string[] = []
      for (const s of body.sites ?? []) {
        if (!s?.name?.trim()) continue
        const inserted = await client.query(
          `INSERT INTO public.sites (tenant_id, name, address, latitude, longitude, geofence_radius_m)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            tenantId,
            s.name.trim(),
            s.address?.trim() ?? '',
            toFloat(s.latitude),
            toFloat(s.longitude),
            toInt(s.geofence_radius_m, 200),
          ]
        )
        siteIds.push(inserted.rows[0].id as string)
      }

      // 2) Departments — link to sites by the original array index.
      for (const d of body.departments ?? []) {
        if (!d?.name?.trim()) continue
        const siteId =
          d.site_index != null && d.site_index >= 0 && d.site_index < siteIds.length
            ? siteIds[d.site_index]
            : null
        await client.query(
          `INSERT INTO public.departments (tenant_id, name, site_id)
           VALUES ($1, $2, $3)`,
          [tenantId, d.name.trim(), siteId]
        )
      }

      // 3) Organisation roles.
      for (const r of body.roles ?? []) {
        if (!r?.name?.trim() || !r.base_role) continue
        await client.query(
          `INSERT INTO public.organisation_roles (tenant_id, name, base_role)
           VALUES ($1, $2, $3::public.tenant_role)`,
          [tenantId, r.name.trim(), r.base_role]
        )
      }

      // 4) Shifts — shifts.site_id is NOT NULL, so only insert shifts that
      // resolve to a real site; silently skip any with an invalid site_index.
      for (const sh of body.shifts ?? []) {
        if (!sh?.name?.trim() || !sh.start_time || !sh.end_time) continue
        const siteId =
          sh.site_index != null && sh.site_index >= 0 && sh.site_index < siteIds.length
            ? siteIds[sh.site_index]
            : null
        if (!siteId) continue
        await client.query(
          `INSERT INTO public.shifts (tenant_id, site_id, name, start_time, end_time, grace_period_minutes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            tenantId,
            siteId,
            sh.name.trim(),
            sh.start_time,
            sh.end_time,
            toInt(sh.grace_period_minutes, 0),
          ]
        )
      }

      // 5) Finalise the tenant: activate and persist configuration settings.
      await client.query(
        `UPDATE public.tenants
            SET name = $2,
                country = COALESCE($3, country),
                status = 'active'::public.tenant_status,
                settings = $4::jsonb
          WHERE id = $1`,
        [
          tenantId,
          companyName,
          body.company?.country?.trim() ?? null,
          JSON.stringify({
            industry: body.company?.industry ?? null,
            workRules: body.workRules ?? null,
            checkInMethods: body.checkInMethods ?? null,
          }),
        ]
      )

      await client.query('COMMIT')
      return res.status(200).json({ success: true, tenantId, sitesCreated: siteIds.length })
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => null)
      console.error('Onboarding completion failed:', error)
      return res.status(500).json({ error: error.message || 'Failed to complete onboarding.' })
    } finally {
      client.release()
    }
  }
)

export default router

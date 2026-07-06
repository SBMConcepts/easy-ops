import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { TablesUpdate } from '../types/supabase.js'
import { auth } from 'express-openid-connect'

const router = Router()

async function ensureDefaultDepartment(orgId: string): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from('org_departments')
    .select('id')
    .eq('auth0_org_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created } = await supabaseAdmin
    .from('org_departments')
    .insert({ auth0_org_id: orgId, department_name: 'Default' })
    .select('id')
    .maybeSingle()
  return created?.id ?? null
}

interface SiteBody {
  auth0_org_id?: string
  site_name?: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  geofence_radius_m?: number | null
  department_id?: string | null
}

function serializeSite(row: {
  id: string
  auth0_org_id: string
  site_name: string
  address: string
  latitude: number
  longitude: number
  geo_radius: number
  department_id: string
}) {
  return {
    id: row.id,
    auth0_org_id: row.auth0_org_id,
    name: row.site_name,
    site_name: row.site_name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    geofence_radius_m: row.geo_radius,
    department_id: row.department_id,
  }
}

router.get(
  '/api/org-sites',
  requireAuth,
  requireOrg,
  requirePermission('read:org_sites'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('org_sites')
      .select(
        'id, auth0_org_id, site_name, address, latitude, longitude, geo_radius, department_id'
      )
      .eq('auth0_org_id', req.orgId!)
      .order('site_name', { ascending: true })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json((data ?? []).map(serializeSite))
  }
)

router.post(
  '/api/org-sites',
  requireAuth,
  requireOrg,
  requirePermission('write:org_sites'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as SiteBody
    if (!body.site_name?.trim()) {
      res.status(400).json({ error: 'site name is required.' })
      return
    }
    const departmentId = body.department_id ?? (await ensureDefaultDepartment(req.orgId!))
    if (!departmentId) {
      res.status(500).json({ error: 'Could not resolve a department for the site.' })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('org_sites')
      .insert({
        auth0_org_id: req.orgId!,
        site_name: body.site_name.trim(),
        address: body.address ?? '',
        latitude: body.latitude ?? 0,
        longitude: body.longitude ?? 0,
        geo_radius: body.geofence_radius_m ?? 0,
        department_id: departmentId,
      })
      .select(
        'id, auth0_org_id, site_name, address, latitude, longitude, geo_radius, department_id'
      )
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json(serializeSite(data))
  }
)

router.patch(
  '/api/org-sites/:id',
  requireAuth,
  requireOrg,
  requirePermission('write:org_sites'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as SiteBody
    const update: TablesUpdate<'org_sites'> = {}
    if (typeof body.site_name === 'string') update.site_name = body.site_name.trim()
    if (body.address !== undefined) update.address = body.address ?? ''
    if (body.latitude !== undefined) update.latitude = body.latitude ?? 0
    if (body.longitude !== undefined) update.longitude = body.longitude ?? 0
    if (body.geofence_radius_m !== undefined) update.geo_radius = body.geofence_radius_m ?? 0
    if (body.department_id) update.department_id = body.department_id

    const { data, error } = await supabaseAdmin
      .from('org_sites')
      .update(update)
      .eq('auth0_org_id', req.orgId!)
      .eq('id', String(req.params.id))
      .select(
        'id, auth0_org_id, site_name, address, latitude, longitude, geo_radius, department_id'
      )
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Site not found.' })
      return
    }
    res.json(serializeSite(data))
  }
)

router.delete(
  '/api/org-sites/:id',
  requireAuth,
  requireOrg,
  requirePermission('delete:org_sites'),
  async (req: AuthedRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from('org_sites')
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

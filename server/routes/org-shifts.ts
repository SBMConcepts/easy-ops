import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { TablesInsert, TablesUpdate } from '../types/supabase.js'

const router = Router()

const SHIFT_COLUMNS =
  'id, auth0_org_id, name:shift_name, start_time, end_time, grace_period_minutes, weekly_hours'

interface ShiftBody {
  name?: string
  start_time?: string | null
  end_time?: string | null
  grace_period_minutes?: number | null
  weekly_hours?: number | null
}

// Normalize a "HH:MM"/"HH:MM:SS" input for a NOT NULL `time` column. Returns
// undefined when blank or not provided, so callers can reject it explicitly.
function timeOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return String(value)
}

function numberOrNull(value: unknown, provided: boolean): number | null | undefined {
  if (!provided) return undefined
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

router.get(
  '/api/org-shifts',
  requireAuth,
  requireOrg,
  requirePermission('read:org_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('org_shifts')
      .select(SHIFT_COLUMNS)
      .eq('auth0_org_id', req.orgId!)
      .order('shift_name', { ascending: true })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ shifts: data ?? [] })
  }
)

router.post(
  '/api/org-shifts',
  requireAuth,
  requireOrg,
  requirePermission('write:org_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as ShiftBody
    if (!body.name?.trim()) {
      res.status(400).json({ error: 'name is required.' })
      return
    }
    const insert: TablesInsert<'org_shifts'> = {
      auth0_org_id: req.orgId!,
      shift_name: body.name.trim(),
      start_time: '',
      end_time: '',
    }
    const start = timeOrUndefined(body.start_time)
    const end = timeOrUndefined(body.end_time)
    if (!start || !end) {
      res.status(400).json({ error: 'start_time and end_time are required.' })
      return
    }
    insert.start_time = start
    insert.end_time = end
    const grace = numberOrNull(body.grace_period_minutes, 'grace_period_minutes' in body)
    if (grace !== undefined && grace !== null) insert.grace_period_minutes = grace
    const weekly = numberOrNull(body.weekly_hours, 'weekly_hours' in body)
    if (weekly !== undefined) insert.weekly_hours = weekly

    const { data, error } = await supabaseAdmin
      .from('org_shifts')
      .insert(insert)
      .select(SHIFT_COLUMNS)
      .single()
    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'A shift with that name already exists.' })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json({ shift: data })
  }
)

router.patch(
  '/api/org-shifts/:id',
  requireAuth,
  requireOrg,
  requirePermission('write:org_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as ShiftBody
    const update: TablesUpdate<'org_shifts'> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string') {
      if (!body.name.trim()) {
        res.status(400).json({ error: 'name cannot be empty.' })
        return
      }
      update.shift_name = body.name.trim()
    }
    if ('start_time' in body) {
      const start = timeOrUndefined(body.start_time)
      if (!start) {
        res.status(400).json({ error: 'start_time cannot be empty.' })
        return
      }
      update.start_time = start
    }
    if ('end_time' in body) {
      const end = timeOrUndefined(body.end_time)
      if (!end) {
        res.status(400).json({ error: 'end_time cannot be empty.' })
        return
      }
      update.end_time = end
    }
    const grace = numberOrNull(body.grace_period_minutes, 'grace_period_minutes' in body)
    if (grace !== undefined && grace !== null) update.grace_period_minutes = grace
    const weekly = numberOrNull(body.weekly_hours, 'weekly_hours' in body)
    if (weekly !== undefined) update.weekly_hours = weekly

    const { data, error } = await supabaseAdmin
      .from('org_shifts')
      .update(update)
      .eq('auth0_org_id', req.orgId!)
      .eq('id', String(req.params.id))
      .select(SHIFT_COLUMNS)
      .maybeSingle()
    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'A shift with that name already exists.' })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Shift not found.' })
      return
    }
    res.json({ shift: data })
  }
)

router.delete(
  '/api/org-shifts/:id',
  requireAuth,
  requireOrg,
  requirePermission('delete:org_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from('org_shifts')
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

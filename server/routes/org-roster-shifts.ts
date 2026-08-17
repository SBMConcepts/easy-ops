import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Database, TablesInsert, TablesUpdate } from '../types/supabase.js'

type RosterShiftStatus = Database['public']['Enums']['roster_shift_status']

const ROSTER_STATUSES = new Set<RosterShiftStatus>(['scheduled', 'cancelled'])
const ROSTER_COLUMNS =
  'id, auth0_org_id, auth0_user_id, site_id, start_at, end_at, status, created_at, updated_at'

interface RosterShiftBody {
  auth0_user_id?: unknown
  site_id?: unknown
  start_at?: unknown
  end_at?: unknown
  status?: unknown
}

function isRosterStatus(value: unknown): value is RosterShiftStatus {
  return typeof value === 'string' && ROSTER_STATUSES.has(value as RosterShiftStatus)
}

function isoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function validateAssignmentTargets(
  orgId: string,
  auth0UserId: string,
  siteId: string | null
): Promise<string | null> {
  const { data: member, error: memberError } = await supabaseAdmin
    .from('org_members')
    .select('auth0_user_id')
    .eq('auth0_org_id', orgId)
    .eq('auth0_user_id', auth0UserId)
    .eq('status', 'active')
    .maybeSingle()
  if (memberError) return memberError.message
  if (!member) return 'The selected active member does not belong to this organization.'

  if (!siteId) return null
  const { data: site, error: siteError } = await supabaseAdmin
    .from('org_sites')
    .select('id')
    .eq('auth0_org_id', orgId)
    .eq('id', siteId)
    .maybeSingle()
  if (siteError) return siteError.message
  return site ? null : 'The selected site does not belong to this organization.'
}

const router = Router()

router.get(
  '/api/org-roster-shifts',
  requireAuth,
  requireOrg,
  requirePermission('read:org_roster_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const from = typeof req.query.from === 'string' ? isoTimestamp(req.query.from) : null
    const to = typeof req.query.to === 'string' ? isoTimestamp(req.query.to) : null
    const siteId =
      typeof req.query.site_id === 'string' && req.query.site_id ? req.query.site_id : null
    if (
      (typeof req.query.from === 'string' && !from) ||
      (typeof req.query.to === 'string' && !to)
    ) {
      res.status(400).json({ error: 'from and to must be valid ISO timestamps.' })
      return
    }

    let query = supabaseAdmin
      .from('org_roster_shifts')
      .select(ROSTER_COLUMNS)
      .eq('auth0_org_id', req.orgId!)
      .order('start_at', { ascending: true })
      .limit(500)
    if (from) query = query.gte('start_at', from)
    if (to) query = query.lt('start_at', to)
    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    const rows = data ?? []
    const userIds = [...new Set(rows.map((row) => row.auth0_user_id))]
    const [membersResult, sitesResult] = await Promise.all([
      userIds.length
        ? supabaseAdmin
            .from('org_members')
            .select('auth0_user_id, full_name')
            .eq('auth0_org_id', req.orgId!)
            .in('auth0_user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from('org_sites').select('id, site_name').eq('auth0_org_id', req.orgId!),
    ])
    const lookupError = membersResult.error ?? sitesResult.error
    if (lookupError) {
      res.status(500).json({ error: lookupError.message })
      return
    }

    const memberById = new Map(
      (membersResult.data ?? []).map((member) => [member.auth0_user_id, member.full_name])
    )
    const siteById = new Map((sitesResult.data ?? []).map((site) => [site.id, site.site_name]))
    res.json({
      roster_shifts: rows.map((row) => ({
        ...row,
        member_name: memberById.get(row.auth0_user_id) ?? null,
        site_name: row.site_id ? (siteById.get(row.site_id) ?? null) : null,
      })),
    })
  }
)

router.post(
  '/api/org-roster-shifts',
  requireAuth,
  requireOrg,
  requirePermission('write:org_roster_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as RosterShiftBody
    const auth0UserId = typeof body.auth0_user_id === 'string' ? body.auth0_user_id : ''
    const siteId = typeof body.site_id === 'string' && body.site_id ? body.site_id : null
    const startAt = isoTimestamp(body.start_at)
    const endAt = isoTimestamp(body.end_at)
    const status = body.status === undefined ? 'scheduled' : body.status
    if (!auth0UserId || !startAt || !endAt || !isRosterStatus(status)) {
      res.status(400).json({ error: 'member, start_at, end_at, and a valid status are required.' })
      return
    }
    if (new Date(endAt) <= new Date(startAt)) {
      res.status(400).json({ error: 'end_at must be after start_at.' })
      return
    }
    const targetError = await validateAssignmentTargets(req.orgId!, auth0UserId, siteId)
    if (targetError) {
      res.status(400).json({ error: targetError })
      return
    }

    const insert: TablesInsert<'org_roster_shifts'> = {
      auth0_org_id: req.orgId!,
      auth0_user_id: auth0UserId,
      site_id: siteId,
      start_at: startAt,
      end_at: endAt,
      status,
    }
    const { data, error } = await supabaseAdmin
      .from('org_roster_shifts')
      .insert(insert)
      .select(ROSTER_COLUMNS)
      .single()
    if (error) {
      if (error.code === '23505') {
        res
          .status(409)
          .json({ error: 'This member already has an assignment starting at that time.' })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json({ roster_shift: data })
  }
)

router.patch(
  '/api/org-roster-shifts/:id',
  requireAuth,
  requireOrg,
  requirePermission('write:org_roster_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as RosterShiftBody
    const { data: current, error: currentError } = await supabaseAdmin
      .from('org_roster_shifts')
      .select(ROSTER_COLUMNS)
      .eq('auth0_org_id', req.orgId!)
      .eq('id', String(req.params.id))
      .maybeSingle()
    if (currentError) {
      res.status(500).json({ error: currentError.message })
      return
    }
    if (!current) {
      res.status(404).json({ error: 'Roster assignment not found.' })
      return
    }

    const auth0UserId =
      body.auth0_user_id === undefined
        ? current.auth0_user_id
        : typeof body.auth0_user_id === 'string'
          ? body.auth0_user_id
          : ''
    const siteId =
      body.site_id === undefined
        ? current.site_id
        : typeof body.site_id === 'string' && body.site_id
          ? body.site_id
          : null
    const startAt = body.start_at === undefined ? current.start_at : isoTimestamp(body.start_at)
    const endAt = body.end_at === undefined ? current.end_at : isoTimestamp(body.end_at)
    const status = body.status === undefined ? current.status : body.status
    if (!auth0UserId || !startAt || !endAt || !isRosterStatus(status)) {
      res.status(400).json({ error: 'member, start_at, end_at, and a valid status are required.' })
      return
    }
    if (new Date(endAt) <= new Date(startAt)) {
      res.status(400).json({ error: 'end_at must be after start_at.' })
      return
    }
    const targetError = await validateAssignmentTargets(req.orgId!, auth0UserId, siteId)
    if (targetError) {
      res.status(400).json({ error: targetError })
      return
    }

    const update: TablesUpdate<'org_roster_shifts'> = {
      auth0_user_id: auth0UserId,
      site_id: siteId,
      start_at: startAt,
      end_at: endAt,
      status,
    }
    const { data, error } = await supabaseAdmin
      .from('org_roster_shifts')
      .update(update)
      .eq('auth0_org_id', req.orgId!)
      .eq('id', current.id)
      .select(ROSTER_COLUMNS)
      .maybeSingle()
    if (error) {
      if (error.code === '23505') {
        res
          .status(409)
          .json({ error: 'This member already has an assignment starting at that time.' })
        return
      }
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ roster_shift: data })
  }
)

router.delete(
  '/api/org-roster-shifts/:id',
  requireAuth,
  requireOrg,
  requirePermission('delete:org_roster_shifts'),
  async (req: AuthedRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from('org_roster_shifts')
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

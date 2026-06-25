// Daily attendance aggregate for the current organization (org_attendance).
//
//   GET  /api/org-attendance   — list attendance rows for the org (member+)
//   POST /api/org-attendance   — record a daily attendance row for the caller
//
// org_attendance is a DAILY AGGREGATE (not an event log): one row per
// (user, date) capturing the check-in method plus hours worked and overtime.
// user_id references users.auth0_user_id, so it is the caller's Auth0 sub.
import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Database } from '../types/supabase.js'

type CheckInMethod = Database['public']['Enums']['check_in_method']

const CHECK_IN_METHODS = new Set<CheckInMethod>([
  'qr',
  'biometric',
  'whatsapp',
  'manual',
  'georefrence',
])

function isCheckInMethod(value: unknown): value is CheckInMethod {
  return typeof value === 'string' && CHECK_IN_METHODS.has(value as CheckInMethod)
}

const router = Router()

router.get(
  '/api/org-attendance',
  requireAuth,
  requireOrg,
  requireRole('member'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('org_attendance')
      .select('id, org_id, user_id, date, method, hours_worked, overtime, created_at')
      .eq('org_id', req.orgId!)
      .order('date', { ascending: false })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ attendance: data ?? [] })
  }
)

router.post(
  '/api/org-attendance',
  requireAuth,
  requireOrg,
  requireRole('member'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as {
      date?: string
      method?: string
      hours_worked?: number
      overtime?: number
    }
    if (!body.date || !isCheckInMethod(body.method)) {
      res.status(400).json({ error: 'date and a valid check-in method are required.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('org_attendance')
      .insert({
        org_id: req.orgId!,
        user_id: req.auth!.sub,
        date: body.date,
        method: body.method,
        hours_worked: Number(body.hours_worked ?? 0),
        overtime: Number(body.overtime ?? 0),
      })
      .select('id, org_id, user_id, date, method, hours_worked, overtime, created_at')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json(data)
  }
)

export default router

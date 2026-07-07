import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
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
  requirePermission('read:org_attendance'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('org_attendance')
      .select(
        'id, auth0_org_id, auth0_user_id, date, method, hours_worked, overtime, created_at, department_id, site_id'
      )
      .eq('auth0_org_id', req.orgId!)
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
  requirePermission('write:org_attendance'),
  async (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as {
      auth0_org_id?: string
      auth0_user_id?: string
      date?: string
      method?: string
      hours_worked?: number
      overtime?: number
    }
    if (!body.date || !isCheckInMethod(body.method)) {
      res.status(400).json({ error: 'date and a valid check-in method are required.' })
      return
    }

    // Inherit the member's assigned department & site so the attendance record
    // captures where they checked in. Resolved server-side from the membership,
    // never trusted from the request body.
    const { data: membership } = await supabaseAdmin
      .from('org_members')
      .select('department_id, site_id')
      .eq('auth0_org_id', req.orgId!)
      .eq('auth0_user_id', req.auth?.sub ?? '')
      .maybeSingle()

    const { data, error } = await supabaseAdmin
      .from('org_attendance')
      .upsert(
        {
          auth0_org_id: req.orgId!,
          auth0_user_id: req.auth?.sub,
          date: body.date,
          method: body.method,
          hours_worked: Number(body.hours_worked ?? 0),
          overtime: Number(body.overtime ?? 0),
          department_id: membership?.department_id ?? null,
          site_id: membership?.site_id ?? null,
        },
        { onConflict: 'auth0_user_id,auth0_org_id,date' }
      )
      .select(
        'id, auth0_org_id, auth0_user_id, date, method, hours_worked, overtime, created_at, department_id, site_id'
      )
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json(data)
  }
)

export default router

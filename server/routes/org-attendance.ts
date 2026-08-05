import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Database } from '../types/supabase.js'

type CheckInMethod = Database['public']['Enums']['attendance_method']

const CHECK_IN_METHODS = new Set<CheckInMethod>(['whatsapp', 'biometric', 'ussd', 'qr'])

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

    const rows = data ?? []

    // org_attendance stores only raw references (auth0_user_id, department_id,
    // site_id). Resolve those to human-readable identities so the client never
    // has to display an Auth0 sub or a UUID. The attendance user is the same
    // auth0_user_id that keys org_members / user_credentials; the person's
    // first/last name lives on the users row for that sub.
    const authUserIds = [
      ...new Set(
        rows
          .map((r) => r.auth0_user_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ),
    ]

    const usersBySub = new Map<
      string,
      { first_name: string; last_name: string; full_name: string }
    >()
    if (authUserIds.length > 0) {
      const { data: users, error: usersErr } = await supabaseAdmin
        .from('org_members')
        .select('auth0_user_id, first_name, last_name, full_name')
        .in('auth0_user_id', authUserIds)
      if (usersErr) {
        res.status(500).json({ error: usersErr.message })
        return
      }
      for (const u of users ?? []) usersBySub.set(u.auth0_user_id, u)
    }

    const [deptsRes, sitesRes] = await Promise.all([
      supabaseAdmin
        .from('org_departments')
        .select('id, department_name')
        .eq('auth0_org_id', req.orgId!),
      supabaseAdmin.from('org_sites').select('id, site_name').eq('auth0_org_id', req.orgId!),
    ])
    const lookupErr = deptsRes.error ?? sitesRes.error
    if (lookupErr) {
      res.status(500).json({ error: lookupErr.message })
      return
    }
    const deptById = new Map((deptsRes.data ?? []).map((d) => [d.id, d.department_name]))
    const siteById = new Map((sitesRes.data ?? []).map((s) => [s.id, s.site_name]))

    const attendance = rows.map((r) => {
      const u = r.auth0_user_id ? usersBySub.get(r.auth0_user_id) : undefined
      return {
        ...r,
        first_name: u?.first_name ?? null,
        last_name: u?.last_name ?? null,
        full_name: u?.full_name ?? null,
        department_name: r.department_id ? (deptById.get(r.department_id) ?? null) : null,
        site_name: r.site_id ? (siteById.get(r.site_id) ?? null) : null,
      }
    })

    res.json({ attendance })
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
    // never trusted from the request body. department_id is NOT NULL on
    // org_attendance, so a member with no department assigned cannot check in.
    const { data: membership } = await supabaseAdmin
      .from('org_members')
      .select('department_id, site_id')
      .eq('auth0_org_id', req.orgId!)
      .eq('auth0_user_id', req.auth?.sub ?? '')
      .maybeSingle()

    if (!membership?.department_id) {
      res.status(400).json({
        error: 'You must have an assigned department before you can check in. Contact an admin.',
      })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('org_attendance')
      .upsert(
        {
          auth0_org_id: req.orgId!,
          auth0_user_id: req.auth?.sub ?? '',
          date: body.date,
          method: body.method,
          hours_worked: Number(body.hours_worked ?? 0),
          overtime: Number(body.overtime ?? 0),
          department_id: membership.department_id,
          site_id: membership.site_id ?? null,
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

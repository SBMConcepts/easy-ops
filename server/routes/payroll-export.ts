import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

// Payroll Export Pro API.
//
// The pay register is computed by the Supabase Edge Function
// (supabase/functions/payroll-export) which runs the BCEA-style calc with a
// service-role client. This Express router is the cookie-authenticated entry
// point: it enforces permission + the Business (Pro)/Enterprise plan gate, then
// invokes the function server-to-server with a shared secret (the browser holds
// no Auth0 token in this app, so it cannot call the function directly). It also
// exposes the export audit history from payroll_export_runs.

// Plans that unlock payroll export (mirrors the edge function + frontend flag).
const FULL_PAYROLL_PLANS = new Set(['pro', 'enterprise'])

const EXPORT_FORMATS = ['full', 'sage', 'xero', 'payspace', 'sars_emp201'] as const
type ExportFormat = (typeof EXPORT_FORMATS)[number]

function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === 'string' && (EXPORT_FORMATS as readonly string[]).includes(value)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// POST /api/payroll-export/generate — compute a payroll export for a pay period.
router.post(
  '/api/payroll-export/generate',
  requireAuth,
  requireOrg,
  requirePermission('write:payroll_exports'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      period_start?: unknown
      period_end?: unknown
      format?: unknown
    }

    if (!ISO_DATE.test(String(body.period_start)) || !ISO_DATE.test(String(body.period_end))) {
      res.status(400).json({ error: 'period_start and period_end (YYYY-MM-DD) are required.' })
      return
    }
    const format: ExportFormat = isExportFormat(body.format) ? body.format : 'full'

    // Plan gate — payroll export only.
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('plan')
      .eq('auth0_org_id', orgId)
      .maybeSingle()
    if (orgErr) {
      res.status(500).json({ error: orgErr.message })
      return
    }
    if (!org || !FULL_PAYROLL_PLANS.has(String(org.plan))) {
      res.status(403).json({
        error: 'Payroll Export Pro requires a Business (Pro) or Enterprise plan.',
      })
      return
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const fnSecret = process.env.PAYROLL_FN_SECRET
    if (!supabaseUrl || !fnSecret) {
      res.status(500).json({
        error: 'Payroll function is not configured (SUPABASE_URL / PAYROLL_FN_SECRET).',
      })
      return
    }

    try {
      const fnRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/payroll-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-payroll-secret': fnSecret },
        body: JSON.stringify({
          org_id: orgId,
          period_start: String(body.period_start),
          period_end: String(body.period_end),
          format,
        }),
      })
      const payload = (await fnRes.json().catch(() => ({}))) as Record<string, unknown>
      if (!fnRes.ok) {
        res.status(fnRes.status).json({
          error: (payload.error as string) ?? 'Payroll export failed.',
        })
        return
      }
      res.json(payload)
    } catch (err) {
      res.status(502).json({ error: `Payroll function unreachable: ${(err as Error).message}` })
    }
  }
)

// GET /api/payroll-export/runs[?limit=] — export audit history, newest first.
router.get(
  '/api/payroll-export/runs',
  requireAuth,
  requireOrg,
  requirePermission('read:payroll_exports'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const limit = Math.min(Number(req.query.limit) || 50, 200)

    const { data, error } = await supabaseAdmin
      .from('payroll_export_runs')
      .select('*')
      .eq('auth0_org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ runs: data ?? [] })
  }
)

export default router

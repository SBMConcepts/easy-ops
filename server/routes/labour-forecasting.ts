import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { TablesUpdate } from '../types/supabase.js'

const router = Router()

// Predictive Labour Forecasting read + alert-management API.
//
// Forecast SNAPSHOTS are written by the Supabase Edge Function
// (supabase/functions/labour-forecast) which runs the AI/heuristic model with a
// service-role client. This Express router is the read path for the workspace
// UI plus the alert lifecycle (acknowledge / resolve / dismiss). Everything runs
// through the service-role client, so RLS is bypassed and tenancy is enforced
// here by scoping every query to req.orgId.

const ALERT_STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'] as const
type AlertStatus = (typeof ALERT_STATUSES)[number]

function isAlertStatus(value: unknown): value is AlertStatus {
  return typeof value === 'string' && (ALERT_STATUSES as readonly string[]).includes(value)
}

// GET /api/labour-forecasts[?site_id=&from=&to=&limit=]
// Returns forecast snapshots for the org, newest first. Optional filters narrow
// by site and forecast_date window.
router.get(
  '/api/labour-forecasts',
  requireAuth,
  requireOrg,
  requirePermission('read:labour_forecasts'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const siteId =
      typeof req.query.site_id === 'string' && req.query.site_id ? req.query.site_id : null
    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null
    const limit = Math.min(Number(req.query.limit) || 90, 365)

    let query = supabaseAdmin
      .from('labour_forecasts')
      .select('*')
      .eq('auth0_org_id', orgId)
      .order('forecast_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (siteId) query = query.eq('site_id', siteId)
    if (from) query = query.gte('forecast_date', from)
    if (to) query = query.lte('forecast_date', to)

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ forecasts: data ?? [] })
  }
)

// Plans that unlock forecast generation (mirrors the edge function + frontend
// feature flag). Growth is view-only; free/starter have no forecasting.
const FULL_FORECAST_PLANS = new Set(['pro', 'enterprise'])

async function requireFullForecastPlan(orgId: string, res: Response): Promise<boolean> {
  const { data: org, error } = await supabaseAdmin
    .from('organizations')
    .select('plan')
    .eq('auth0_org_id', orgId)
    .maybeSingle()
  if (error) {
    res.status(500).json({ error: error.message })
    return false
  }
  if (!org || !FULL_FORECAST_PLANS.has(String(org.plan))) {
    res.status(403).json({ error: 'Forecasting requires a Pro or Enterprise plan.' })
    return false
  }
  return true
}

// POST /api/labour-forecasts/generate — trigger a new AI/heuristic forecast.
// The heavy lifting (model + writes) runs in the Supabase Edge Function; this
// route enforces cookie auth + permission + plan, then invokes the function
// server-to-server with a shared secret (the browser holds no Auth0 token in
// this app, so it cannot call the function directly).
router.post(
  '/api/labour-forecasts/generate',
  requireAuth,
  requireOrg,
  requirePermission('write:labour_forecasts'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as { site_id?: string; horizon_days?: number }

    if (!(await requireFullForecastPlan(orgId, res))) return

    const supabaseUrl = process.env.SUPABASE_URL
    const fnSecret = process.env.FORECAST_FN_SECRET
    if (!supabaseUrl || !fnSecret) {
      res.status(500).json({
        error: 'Forecast function is not configured (SUPABASE_URL / FORECAST_FN_SECRET).',
      })
      return
    }

    try {
      const fnRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/labour-forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forecast-secret': fnSecret },
        body: JSON.stringify({
          org_id: orgId,
          generated_by: req.auth!.sub,
          site_id: typeof body.site_id === 'string' ? body.site_id : undefined,
          horizon_days: typeof body.horizon_days === 'number' ? body.horizon_days : undefined,
        }),
      })
      const payload = (await fnRes.json().catch(() => ({}))) as Record<string, unknown>
      if (!fnRes.ok) {
        res.status(fnRes.status).json({
          error: (payload.error as string) ?? 'Forecast generation failed.',
        })
        return
      }
      res.json(payload)
    } catch (err) {
      res.status(502).json({ error: `Forecast function unreachable: ${(err as Error).message}` })
    }
  }
)

// GET /api/labour-forecasts/accuracy[?site_id=&window=]
// Accuracy reads historical forecasts through the same server-to-server Edge
// Function boundary as generation, so the browser never needs Edge credentials.
router.get(
  '/api/labour-forecasts/accuracy',
  requireAuth,
  requireOrg,
  requirePermission('read:labour_forecasts'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    if (!(await requireFullForecastPlan(orgId, res))) return

    const rawWindow = typeof req.query.window === 'string' ? Number(req.query.window) : 30
    if (!Number.isFinite(rawWindow)) {
      res.status(400).json({ error: 'window must be a number.' })
      return
    }
    const window = Math.min(Math.max(Math.round(rawWindow), 7), 90)
    const siteId =
      typeof req.query.site_id === 'string' && req.query.site_id ? req.query.site_id : undefined
    const supabaseUrl = process.env.SUPABASE_URL
    const fnSecret = process.env.FORECAST_FN_SECRET
    if (!supabaseUrl || !fnSecret) {
      res.status(500).json({
        error: 'Forecast function is not configured (SUPABASE_URL / FORECAST_FN_SECRET).',
      })
      return
    }

    const params = new URLSearchParams({ org_id: orgId, window: String(window) })
    if (siteId) params.set('site_id', siteId)
    try {
      const fnRes = await fetch(
        `${supabaseUrl.replace(/\/$/, '')}/functions/v1/forecast-accuracy?${params.toString()}`,
        { headers: { 'x-forecast-secret': fnSecret } }
      )
      const payload = (await fnRes.json().catch(() => ({}))) as Record<string, unknown>
      if (!fnRes.ok) {
        res.status(fnRes.status).json({
          error: (payload.error as string) ?? 'Forecast accuracy lookup failed.',
        })
        return
      }
      res.json(payload)
    } catch (err) {
      res
        .status(502)
        .json({ error: `Forecast accuracy function unreachable: ${(err as Error).message}` })
    }
  }
)

// GET /api/labour-alerts[?site_id=&status=&limit=]
// Returns alerts for the org, newest first. Optional status filter.
router.get(
  '/api/labour-alerts',
  requireAuth,
  requireOrg,
  requirePermission('read:labour_alerts'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const status = isAlertStatus(req.query.status) ? req.query.status : null
    const siteId =
      typeof req.query.site_id === 'string' && req.query.site_id ? req.query.site_id : null
    const limit = Math.min(Number(req.query.limit) || 100, 500)

    let query = supabaseAdmin
      .from('labour_alerts')
      .select('*')
      .eq('auth0_org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ alerts: data ?? [] })
  }
)

// PATCH /api/labour-alerts/:id — advance an alert through its lifecycle.
// Body: { status: 'open' | 'acknowledged' | 'resolved' | 'dismissed' }.
// Acknowledging stamps the caller + timestamp; resolving stamps resolved_at
// (and back-fills acknowledgement if it was still open). updated_at is always
// refreshed here because this DB has no update_updated_at_column trigger.
router.patch(
  '/api/labour-alerts/:id',
  requireAuth,
  requireOrg,
  requirePermission('write:labour_alerts'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const alertId = String(req.params.id)
    const callerSub = req.auth!.sub
    const body = (req.body ?? {}) as { status?: unknown }

    if (!isAlertStatus(body.status)) {
      res.status(400).json({ error: `status must be one of: ${ALERT_STATUSES.join(', ')}.` })
      return
    }
    const status = body.status
    const now = new Date().toISOString()

    const patch: TablesUpdate<'labour_alerts'> = { status, updated_at: now }

    if (status === 'acknowledged') {
      patch.acknowledged_by = callerSub
      patch.acknowledged_at = now
      patch.resolved_at = null
    } else if (status === 'resolved') {
      patch.resolved_at = now
      // Back-fill acknowledgement so a resolved alert always has an owner.
      patch.acknowledged_by = callerSub
      patch.acknowledged_at = now
    } else if (status === 'open') {
      // Reopen clears the resolution/acknowledgement stamps.
      patch.acknowledged_by = null
      patch.acknowledged_at = null
      patch.resolved_at = null
    }
    // 'dismissed' keeps any existing acknowledgement metadata intact.

    const { data, error } = await supabaseAdmin
      .from('labour_alerts')
      .update(patch)
      .eq('id', alertId)
      .eq('auth0_org_id', orgId)
      .select('*')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Alert not found in this organization.' })
      return
    }
    res.json({ alert: data })
  }
)

export default router

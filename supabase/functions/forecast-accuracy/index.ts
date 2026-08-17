// Forecast accuracy (walk-forward backtest).
//
// Compares stored forecasts whose date has now passed against the actual
// attendance recorded for that date, and returns rolling MAE / MAPE. Computed
// on read — no extra table.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { evaluateAccuracy, type AccuracyPoint } from '../_shared/forecast-model.ts'

const FORECAST_FN_SECRET = Deno.env.get('FORECAST_FN_SECRET')

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    if (!FORECAST_FN_SECRET || req.headers.get('x-forecast-secret') !== FORECAST_FN_SECRET) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Forecast function is not configured.' }, 500)
    }
    const orgId = url.searchParams.get('org_id') ?? ''
    if (!orgId) return json({ error: 'org_id is required.' }, 400)

    const rawWindow = Number(url.searchParams.get('window') ?? 30)
    if (!Number.isFinite(rawWindow)) return json({ error: 'window must be a number.' }, 400)
    const windowDays = Math.min(Math.max(Math.round(rawWindow), 7), 90)
    const siteId = url.searchParams.get('site_id')
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const today = new Date()
    const from = new Date(today)
    from.setUTCDate(today.getUTCDate() - windowDays)
    const yesterday = new Date(today)
    yesterday.setUTCDate(today.getUTCDate() - 1)

    let fq = supabase
      .from('labour_forecasts')
      .select('forecast_date, predicted_hours, predicted_required_staff, model, created_at')
      .eq('auth0_org_id', orgId)
      .gte('forecast_date', isoDate(from))
      .lte('forecast_date', isoDate(yesterday))
      .order('created_at', { ascending: true })
    fq = siteId ? fq.eq('site_id', siteId) : fq.is('site_id', null)

    let aq = supabase
      .from('org_attendance')
      .select('date, hours_worked, status, auth0_user_id')
      .eq('auth0_org_id', orgId)
      .gte('date', isoDate(from))
      .lte('date', isoDate(yesterday))
    if (siteId) aq = aq.eq('site_id', siteId)

    const [{ data: forecasts, error: fErr }, { data: actuals, error: aErr }] = await Promise.all([
      fq,
      aq,
    ])
    if (fErr) return json({ error: fErr.message }, 500)
    if (aErr) return json({ error: aErr.message }, 500)

    // Latest forecast per date wins (ordered ascending by created_at).
    const predByDate = new Map<string, { hours: number; staff: number; model: string }>()
    for (const f of forecasts ?? []) {
      predByDate.set(f.forecast_date, {
        hours: Number(f.predicted_hours ?? 0),
        staff: Number(f.predicted_required_staff ?? 0),
        model: f.model ?? 'unknown',
      })
    }

    const actualByDate = new Map<string, { hours: number; staff: Set<string> }>()
    for (const r of actuals ?? []) {
      const cur = actualByDate.get(r.date) ?? { hours: 0, staff: new Set<string>() }
      cur.hours += Number(r.hours_worked ?? 0)
      if (r.status === 'present') cur.staff.add(r.auth0_user_id)
      actualByDate.set(r.date, cur)
    }

    const points: AccuracyPoint[] = []
    for (const [date, pred] of predByDate) {
      const act = actualByDate.get(date)
      if (!act) continue
      points.push({
        date,
        predicted_hours: pred.hours,
        actual_hours: Math.round(act.hours * 10) / 10,
        predicted_staff: pred.staff,
        actual_staff: act.staff.size,
      })
    }
    points.sort((a, b) => a.date.localeCompare(b.date))

    const last14 = points.filter(
      (p) => p.date >= isoDate(new Date(today.getTime() - 14 * 86400000))
    )

    return json({
      window_days: windowDays,
      rolling_30: evaluateAccuracy(points),
      rolling_14: evaluateAccuracy(last14),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('forecast-accuracy error', msg)
    return json({ error: msg }, 500)
  }
})

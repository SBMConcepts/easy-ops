// Predictive Labour Forecasting — generation edge function.
//
// 1. Verify the trusted Express proxy's shared secret and supplied organization.
// 2. Pull canonical organization attendance, roster, and membership data.
// 3. Pull attendance history + planned roster shifts + active headcount.
// 4. Run the deterministic statistical model (_shared/forecast-model.ts).
// 5. Optionally let the LLM apply *bounded* adjustments + narrative.
// 6. Supersede prior forecasts for the same dates, insert de-duplicated alerts.
//
// The AI layer is a refinement, never a dependency: if it errors, times out or
// returns an invalid shape, the baseline forecast is persisted as-is.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import {
  applyAiAdjustments,
  runForecast,
  type AiAdjustment,
  type AttendanceRow,
  type DraftAlert,
  type PlannedShift,
} from '../_shared/forecast-model.ts'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const AI_MODEL = 'google/gemini-3.5-flash'
const LOOKBACK_DAYS = 56
const MAX_HORIZON_DAYS = 30
const FORECAST_FN_SECRET = Deno.env.get('FORECAST_FN_SECRET')

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

interface AiRefinement {
  adjustments?: AiAdjustment[]
  narrative?: string
  alert_notes?: { target_date?: string; alert_type?: string; note?: string }[]
}

interface ForecastRequest {
  org_id?: unknown
  generated_by?: unknown
  horizon_days?: unknown
  site_id?: unknown
  use_ai?: unknown
}

async function refineWithAi(
  payload: unknown
): Promise<{ ok: true; data: AiRefinement } | { ok: false; status: number; message: string }> {
  if (!LOVABLE_API_KEY) return { ok: false, status: 0, message: 'AI key not configured' }

  const systemPrompt = `You review a statistical labour-demand forecast for a South African workforce management platform (EazyOps).
A deterministic model (Holt damped trend + weekly seasonality) has already produced baseline daily numbers.
Your job is NOT to re-forecast. Your job is to:
1. Optionally nudge individual days by a multiplicative factor between 0.75 and 1.25 where the context clearly justifies it (e.g. planned roster far above/below baseline, obvious trend break). Leave days alone when unsure.
2. Write a short operational narrative (<= 400 characters) explaining the outlook and the main risks in plain English for a South African operations manager. Reference BCEA overtime limits where relevant.

Return STRICT JSON only:
{"adjustments":[{"date":"YYYY-MM-DD","factor":number,"note":string}],"narrative":string}
Use an empty adjustments array when no change is warranted.`

  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_API_KEY },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, status: res.status, message: text.slice(0, 300) }
  }
  try {
    const body = await res.json()
    const content: string = body.choices?.[0]?.message?.content ?? '{}'
    return { ok: true, data: JSON.parse(content) as AiRefinement }
  } catch (e) {
    return { ok: false, status: 0, message: (e as Error).message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!FORECAST_FN_SECRET || req.headers.get('x-forecast-secret') !== FORECAST_FN_SECRET) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Forecast function is not configured.' }, 500)
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body = (await req.json().catch(() => ({}))) as ForecastRequest
    const orgId = typeof body.org_id === 'string' ? body.org_id : ''
    const userId = typeof body.generated_by === 'string' ? body.generated_by : ''
    if (!orgId || !userId) return json({ error: 'org_id and generated_by are required.' }, 400)

    const rawHorizon = Number(body.horizon_days ?? 7)
    if (!Number.isFinite(rawHorizon)) return json({ error: 'horizon_days must be a number' }, 400)
    const horizon = Math.min(Math.max(Math.round(rawHorizon), 3), MAX_HORIZON_DAYS)
    const rawSite = body.site_id
    if (rawSite != null && typeof rawSite !== 'string') {
      return json({ error: 'site_id must be a string' }, 400)
    }
    const siteId = rawSite || null
    const useAi = body.use_ai !== false

    const today = new Date()
    const start = new Date(today)
    start.setUTCDate(today.getUTCDate() - (LOOKBACK_DAYS - 1))
    const todayIso = isoDate(today)

    // ── data pull ─────────────────────────────────────────────────────────
    let staffQuery = supabase
      .from('org_members')
      .select('auth0_user_id, full_name')
      .eq('auth0_org_id', orgId)
      .eq('status', 'active')
    if (siteId) staffQuery = staffQuery.eq('site_id', siteId)

    const [generatorResult, siteResult, staffResult] = await Promise.all([
      supabase
        .from('org_members')
        .select('auth0_user_id')
        .eq('auth0_org_id', orgId)
        .eq('auth0_user_id', userId)
        .eq('status', 'active')
        .maybeSingle(),
      siteId
        ? supabase
            .from('org_sites')
            .select('id')
            .eq('auth0_org_id', orgId)
            .eq('id', siteId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      staffQuery,
    ])
    if (generatorResult.error) return json({ error: generatorResult.error.message }, 500)
    if (!generatorResult.data)
      return json({ error: 'Forecast generator is not an active member.' }, 403)
    if (siteResult.error) return json({ error: siteResult.error.message }, 500)
    if (siteId && !siteResult.data)
      return json({ error: 'Site not found in this organization.' }, 400)
    if (staffResult.error) return json({ error: staffResult.error.message }, 500)

    const staffRows = staffResult.data ?? []
    const staffIds = staffRows.map((staff) => staff.auth0_user_id)
    let attendanceQuery = supabase
      .from('org_attendance')
      .select('auth0_user_id, date, hours_worked, overtime, status, site_id')
      .eq('auth0_org_id', orgId)
      .gte('date', isoDate(start))
      .lte('date', todayIso)
    let plannedQuery = supabase
      .from('org_roster_shifts')
      .select('auth0_user_id, start_at, end_at, site_id')
      .eq('auth0_org_id', orgId)
      .eq('status', 'scheduled')
      .gte('start_at', today.toISOString())
    if (staffIds.length === 0) {
      attendanceQuery = attendanceQuery.in('auth0_user_id', [''])
      plannedQuery = plannedQuery.in('auth0_user_id', [''])
    } else {
      attendanceQuery = attendanceQuery.in('auth0_user_id', staffIds)
      plannedQuery = plannedQuery.in('auth0_user_id', staffIds)
    }
    if (siteId) {
      attendanceQuery = attendanceQuery.eq('site_id', siteId)
      plannedQuery = plannedQuery.eq('site_id', siteId)
    }

    const [
      { data: attendanceRaw, error: attendanceError },
      { data: plannedRaw, error: plannedError },
    ] = await Promise.all([attendanceQuery, plannedQuery])
    if (attendanceError) return json({ error: attendanceError.message }, 500)
    if (plannedError) return json({ error: plannedError.message }, 500)

    const nameById = new Map(staffRows.map((staff) => [staff.auth0_user_id, staff.full_name]))
    const attendance: AttendanceRow[] = (attendanceRaw ?? []).map((row) => ({
      employee_id: row.auth0_user_id,
      date: row.date,
      hours_worked: row.hours_worked,
      overtime: row.overtime,
      status: row.status,
      site_id: row.site_id,
      full_name: nameById.get(row.auth0_user_id) ?? 'Employee',
    }))
    const planned: PlannedShift[] = (plannedRaw ?? []).map((row) => ({
      employee_id: row.auth0_user_id,
      start_at: row.start_at,
      end_at: row.end_at,
      site_id: row.site_id,
    }))
    const activeStaff = staffRows.length

    // ── model ─────────────────────────────────────────────────────────────
    const baseline = runForecast({
      attendance,
      planned,
      activeStaff,
      today: todayIso,
      horizonDays: horizon,
      lookbackDays: LOOKBACK_DAYS,
    })

    let daily = baseline.daily
    let model = baseline.model
    let reasoning = baseline.reasoning
    let aiApplied = 0
    let aiError: { status: number; message: string } | null = null

    if (useAi) {
      const refinement = await refineWithAi({
        today: todayIso,
        horizon_days: horizon,
        baseline: baseline.daily,
        features: {
          ...baseline.features,
          // Trim the heaviest arrays for the prompt.
          daily_actuals: baseline.features.daily_actuals.slice(-28),
          top_employees_by_hours: baseline.features.top_employees_by_hours.slice(0, 10),
        },
        detected_alerts: baseline.alerts.map((a) => ({
          type: a.alert_type,
          severity: a.severity,
          target_date: a.target_date,
          title: a.title,
        })),
      })

      if (refinement.ok) {
        const applied = applyAiAdjustments(daily, refinement.data.adjustments ?? [])
        daily = applied.daily
        aiApplied = applied.applied
        if (aiApplied > 0) model = 'ai-refined-v1'
        if (typeof refinement.data.narrative === 'string' && refinement.data.narrative.trim()) {
          reasoning = `${refinement.data.narrative.trim()}\n\n${baseline.reasoning}`
        }
      } else {
        aiError = { status: refinement.status, message: refinement.message }
        console.error('AI refinement failed, using baseline', refinement.status, refinement.message)
      }
    }

    // ── persist forecasts (supersede same dates/site) ─────────────────────
    const dates = daily.map((d) => d.date)
    if (dates.length > 0) {
      let del = supabase
        .from('labour_forecasts')
        .delete()
        .eq('auth0_org_id', orgId)
        .in('forecast_date', dates)
      del = siteId ? del.eq('site_id', siteId) : del.is('site_id', null)
      const { error: dErr } = await del
      if (dErr) return json({ error: `Could not supersede forecast: ${dErr.message}` }, 500)
    }

    const forecastRows = daily.map((d, i) => ({
      auth0_org_id: orgId,
      site_id: siteId,
      forecast_date: d.date,
      horizon_days: horizon,
      predicted_required_staff: d.predicted_required_staff,
      predicted_hours: d.predicted_hours,
      demand_score: d.demand_score,
      confidence: baseline.confidence,
      model,
      reasoning,
      input_summary: {
        p10: d.p10,
        p90: d.p90,
        dow_index: d.dow_index,
        ai_adjusted_days: aiApplied,
        ai_error: aiError,
        // Full feature snapshot only on the first row to keep rows light.
        ...(i === 0 ? { features: baseline.features } : {}),
      },
      generated_by: userId,
    }))

    let firstForecastId: string | null = null
    const forecastIdByDate = new Map<string, string>()
    if (forecastRows.length > 0) {
      const { data: inserted, error: fErr } = await supabase
        .from('labour_forecasts')
        .insert(forecastRows)
        .select('id, forecast_date')
      if (fErr) return json({ error: `Could not save forecast: ${fErr.message}` }, 500)
      firstForecastId = inserted?.[0]?.id ?? null
      for (const forecast of inserted ?? [])
        forecastIdByDate.set(forecast.forecast_date, forecast.id)
    }

    // ── de-duplicated alerts ──────────────────────────────────────────────
    const { data: openAlerts } = await supabase
      .from('labour_alerts')
      .select('alert_type, target_date, auth0_user_id')
      .eq('auth0_org_id', orgId)
      .in('status', ['open', 'acknowledged'])

    const seen = new Set(
      (openAlerts ?? []).map(
        (alert) => `${alert.alert_type}|${alert.target_date ?? ''}|${alert.auth0_user_id ?? ''}`
      )
    )

    const fresh: DraftAlert[] = []
    for (const a of baseline.alerts) {
      const key = `${a.alert_type}|${a.target_date ?? ''}|${a.employee_id ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      fresh.push(a)
    }

    if (fresh.length > 0) {
      const { error: alErr } = await supabase.from('labour_alerts').insert(
        fresh.map((a) => ({
          auth0_org_id: orgId,
          forecast_id: a.target_date
            ? (forecastIdByDate.get(a.target_date) ?? null)
            : firstForecastId,
          site_id: siteId,
          auth0_user_id: a.employee_id,
          alert_type: a.alert_type,
          severity: a.severity,
          status: 'open' as const,
          target_date: a.target_date,
          title: a.title,
          detail: a.detail,
          recommended_action: a.recommended_action,
          metrics: a.metrics,
        }))
      )
      if (alErr) return json({ error: `Could not save alerts: ${alErr.message}` }, 500)
    }

    return json({
      daily,
      alerts: fresh,
      suppressed_duplicates: baseline.alerts.length - fresh.length,
      confidence: baseline.confidence,
      reasoning,
      model,
      ai_adjusted_days: aiApplied,
      ai_error: aiError,
      forecast_id: firstForecastId,
      features: baseline.features,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('forecast error', msg)
    return json({ error: msg }, 500)
  }
})

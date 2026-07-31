// Predictive Labour Forecasting — generation edge function.
//
// Responsibilities (generation ONLY; reads + alert lifecycle live in the Express
// router server/routes/labour-forecasting.ts):
//   1. Verify the caller's Auth0 access token (_shared/auth0.ts).
//   2. Enforce the "full forecasting" plan gate (pro | enterprise) server-side,
//      mirroring the frontend feature flag so the capability can't be reached by
//      calling the function directly on a lower plan.
//   3. Aggregate recent attendance / shift / headcount signals for the org.
//   4. Produce a forecast + alerts — via a configured LLM when an API key is
//      present, otherwise via a deterministic statistical heuristic so the
//      feature works with no AI key configured.
//   5. Persist one labour_forecasts snapshot and any derived labour_alerts using
//      the service-role client, then return them.

import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth0 } from '../_shared/auth0.ts'

// Plans that unlock generation. Growth is view-only (limited); free/starter have
// no forecasting access at all.
const FULL_FORECAST_PLANS = new Set(['pro', 'enterprise'])
const LOOKBACK_DAYS = 28

type AlertType = 'understaffed' | 'overstaffed' | 'overtime_risk' | 'absence_spike' | 'coverage_gap'
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

interface DraftAlert {
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  detail: string
  recommended_action: string
  auth0_user_id: string | null
  target_date: string | null
  metrics: Record<string, number | string | null>
}

interface ForecastDraft {
  predicted_required_staff: number
  predicted_hours: number
  demand_score: number
  confidence: number
  model: string
  reasoning: string
  alerts: DraftAlert[]
}

interface AttendanceRow {
  auth0_user_id: string
  date: string
  hours_worked: number
  overtime: number
  site_id: string | null
}

interface ModelInputs {
  activeStaff: number
  lookbackDays: number
  distinctDaysObserved: number
  avgDailyHeadcount: number
  avgDailyHours: number
  totalOvertime: number
  overtimePerStaff: number
  horizonDays: number
  perMemberOvertime: Record<string, number>
  latestDate: string | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Deterministic fallback model ────────────────────────────────────────────
function heuristicForecast(inputs: ModelInputs): ForecastDraft {
  const {
    activeStaff,
    avgDailyHeadcount,
    avgDailyHours,
    overtimePerStaff,
    perMemberOvertime,
    horizonDays,
    distinctDaysObserved,
    latestDate,
  } = inputs

  // Demand pressure blends observed utilisation and overtime load onto a 0–10
  // scale. Overtime is the strongest signal of an under-resourced schedule.
  const utilisation = activeStaff > 0 ? avgDailyHeadcount / activeStaff : 0
  const overtimePressure = clamp(overtimePerStaff / 5, 0, 1)
  const demandScore = round2(clamp(utilisation * 6 + overtimePressure * 4, 0, 10))

  // Required staff scales the observed average headcount by the demand pressure,
  // never dropping below the observed average.
  const predictedRequiredStaff = Math.max(
    Math.round(avgDailyHeadcount),
    Math.ceil(avgDailyHeadcount * (1 + overtimePressure * 0.25))
  )
  const predictedHours = round2(avgDailyHours * horizonDays)

  // Confidence grows with how much history we observed (more days = steadier).
  const confidence = round2(clamp(0.4 + distinctDaysObserved / 60, 0.4, 0.9))

  const alerts: DraftAlert[] = []
  const targetDate = latestDate ? addDays(latestDate, 1) : null

  if (predictedRequiredStaff > activeStaff && activeStaff > 0) {
    const gap = predictedRequiredStaff - activeStaff
    alerts.push({
      alert_type: 'understaffed',
      severity: gap >= 3 ? 'high' : 'medium',
      title: `Projected shortfall of ${gap} staff`,
      detail: `Forecast requires ~${predictedRequiredStaff} staff but only ${activeStaff} active members are available.`,
      recommended_action:
        'Schedule additional shifts, approve overtime, or bring in temporary cover.',
      auth0_user_id: null,
      target_date: targetDate,
      metrics: { predicted_required_staff: predictedRequiredStaff, active_staff: activeStaff, gap },
    })
  }

  if (overtimePressure >= 0.6) {
    alerts.push({
      alert_type: 'overtime_risk',
      severity: overtimePressure >= 0.85 ? 'high' : 'medium',
      title: 'Elevated overtime trend',
      detail: `Average overtime is ${round2(overtimePerStaff)}h per active member over the last ${LOOKBACK_DAYS} days.`,
      recommended_action:
        'Rebalance rosters and review whether headcount matches demand to curb overtime spend.',
      auth0_user_id: null,
      target_date: targetDate,
      metrics: {
        overtime_per_staff: round2(overtimePerStaff),
        total_overtime: round2(inputs.totalOvertime),
      },
    })
  }

  if (utilisation > 0 && utilisation < 0.5 && activeStaff > 0) {
    alerts.push({
      alert_type: 'coverage_gap',
      severity: 'low',
      title: 'Low attendance coverage',
      detail: `Only ${round2(utilisation * 100)}% of active members are attending on an average day.`,
      recommended_action: 'Confirm shift assignments and follow up on unexpected absences.',
      auth0_user_id: null,
      target_date: targetDate,
      metrics: { utilisation: round2(utilisation), avg_daily_headcount: round2(avgDailyHeadcount) },
    })
  }

  // Per-member burnout: individuals carrying a disproportionate overtime load.
  for (const [userId, ot] of Object.entries(perMemberOvertime)) {
    if (ot >= 12) {
      alerts.push({
        alert_type: 'overtime_risk',
        severity: ot >= 20 ? 'critical' : 'high',
        title: 'Individual burnout risk',
        detail: `A team member accumulated ${round2(ot)}h of overtime in the last ${LOOKBACK_DAYS} days.`,
        recommended_action:
          'Redistribute workload and check in on wellbeing before scheduling further overtime.',
        auth0_user_id: userId,
        target_date: targetDate,
        metrics: { member_overtime: round2(ot) },
      })
    }
  }

  const reasoning =
    `Heuristic model over ${distinctDaysObserved} observed day(s): avg headcount ` +
    `${round2(avgDailyHeadcount)}/${activeStaff} active, avg ${round2(avgDailyHours)}h/day, ` +
    `${round2(overtimePerStaff)}h overtime per staff. Demand ${demandScore}/10.`

  return {
    predicted_required_staff: predictedRequiredStaff,
    predicted_hours: predictedHours,
    demand_score: demandScore,
    confidence,
    model: 'heuristic-v1',
    reasoning,
    alerts,
  }
}

// ── Optional LLM refinement ─────────────────────────────────────────────────
// Asks a configured LLM to refine the numeric forecast + reasoning. Alerts stay
// deterministic (derived from data) to keep them auditable. Any failure falls
// back to the heuristic result untouched.
async function llmForecast(inputs: ModelInputs, base: ForecastDraft): Promise<ForecastDraft> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!openaiKey && !anthropicKey) return base

  const prompt =
    'You are a workforce planning analyst. Given these aggregated signals, return STRICT JSON ' +
    'with keys predicted_required_staff (int), predicted_hours (number), demand_score (0-10 number), ' +
    'confidence (0-1 number), reasoning (short string). Signals: ' +
    JSON.stringify({
      active_staff: inputs.activeStaff,
      avg_daily_headcount: round2(inputs.avgDailyHeadcount),
      avg_daily_hours: round2(inputs.avgDailyHours),
      overtime_per_staff: round2(inputs.overtimePerStaff),
      observed_days: inputs.distinctDaysObserved,
      horizon_days: inputs.horizonDays,
    })

  try {
    let content = ''
    let model = ''
    if (openaiKey) {
      model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Respond with strict JSON only.' },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (!resp.ok) return base
      const json = await resp.json()
      content = json?.choices?.[0]?.message?.content ?? ''
    } else {
      model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-3-5-haiku-latest'
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!resp.ok) return base
      const json = await resp.json()
      content = json?.content?.[0]?.text ?? ''
    }

    const parsed = JSON.parse(content) as Partial<ForecastDraft>
    return {
      ...base,
      predicted_required_staff: Number.isFinite(parsed.predicted_required_staff)
        ? Math.max(0, Math.round(Number(parsed.predicted_required_staff)))
        : base.predicted_required_staff,
      predicted_hours: Number.isFinite(parsed.predicted_hours)
        ? round2(Number(parsed.predicted_hours))
        : base.predicted_hours,
      demand_score: Number.isFinite(parsed.demand_score)
        ? round2(clamp(Number(parsed.demand_score), 0, 10))
        : base.demand_score,
      confidence: Number.isFinite(parsed.confidence)
        ? round2(clamp(Number(parsed.confidence), 0, 1))
        : base.confidence,
      model,
      reasoning:
        typeof parsed.reasoning === 'string' && parsed.reasoning
          ? parsed.reasoning
          : base.reasoning,
    }
  } catch (_err) {
    return base
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Authenticate. The browser holds no Auth0 token in this app (Express owns
  // the session cookie), so the primary caller is the Express proxy route
  // (server/routes/labour-forecasting.ts) presenting a shared secret plus a
  // trusted org_id in the body. A direct Auth0 Bearer call is also supported as
  // a fallback for other integrations.
  const body = (await req.json().catch(() => ({}))) as {
    org_id?: string
    site_id?: string
    horizon_days?: number
  }

  const sharedSecret = Deno.env.get('FORECAST_FN_SECRET')
  const presentedSecret = req.headers.get('x-forecast-secret')
  const trustedBySecret = !!sharedSecret && presentedSecret === sharedSecret

  let orgId: string | undefined
  let generatedBy = 'system'
  if (trustedBySecret) {
    orgId = typeof body.org_id === 'string' && body.org_id ? body.org_id : undefined
  } else {
    let claims: Awaited<ReturnType<typeof verifyAuth0>>
    try {
      claims = await verifyAuth0(req)
    } catch (_err) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    orgId = claims.org_id ?? claims.auth0_org_id
    generatedBy = claims.sub ?? 'system'
  }

  if (!orgId) {
    return new Response(JSON.stringify({ error: 'Missing organization context.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // 2. Plan gate — generation requires a full-forecasting plan.
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('plan')
    .eq('auth0_org_id', orgId)
    .maybeSingle()
  if (orgErr) {
    return new Response(JSON.stringify({ error: orgErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!org || !FULL_FORECAST_PLANS.has(String(org.plan))) {
    return new Response(
      JSON.stringify({ error: 'Forecast generation requires a Pro or Enterprise plan.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const siteId = typeof body.site_id === 'string' && body.site_id ? body.site_id : null
  const horizonDays = clamp(Math.round(Number(body.horizon_days) || 7), 1, 90)

  // 3. Aggregate recent signals.
  const since = addDays(new Date().toISOString().slice(0, 10), -LOOKBACK_DAYS)
  let attendanceQuery = supabase
    .from('org_attendance')
    .select('auth0_user_id, date, hours_worked, overtime, site_id')
    .eq('auth0_org_id', orgId)
    .gte('date', since)
  if (siteId) attendanceQuery = attendanceQuery.eq('site_id', siteId)
  const { data: attendanceData, error: attErr } = await attendanceQuery
  if (attErr) {
    return new Response(JSON.stringify({ error: attErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const attendance = (attendanceData ?? []) as AttendanceRow[]

  let memberQuery = supabase
    .from('org_members')
    .select('auth0_user_id', { count: 'exact', head: true })
    .eq('auth0_org_id', orgId)
    .eq('status', 'active')
  if (siteId) memberQuery = memberQuery.eq('site_id', siteId)
  const { count: memberCount } = await memberQuery
  const activeStaff = memberCount ?? 0

  const perDayHeadcount = new Map<string, Set<string>>()
  const perDayHours = new Map<string, number>()
  const perMemberOvertime: Record<string, number> = {}
  let totalOvertime = 0
  let latestDate: string | null = null

  for (const row of attendance) {
    if (!perDayHeadcount.has(row.date)) perDayHeadcount.set(row.date, new Set())
    perDayHeadcount.get(row.date)!.add(row.auth0_user_id)
    perDayHours.set(row.date, (perDayHours.get(row.date) ?? 0) + Number(row.hours_worked || 0))
    const ot = Number(row.overtime || 0)
    perMemberOvertime[row.auth0_user_id] = (perMemberOvertime[row.auth0_user_id] ?? 0) + ot
    totalOvertime += ot
    if (!latestDate || row.date > latestDate) latestDate = row.date
  }

  const distinctDaysObserved = perDayHeadcount.size
  const avgDailyHeadcount =
    distinctDaysObserved > 0
      ? [...perDayHeadcount.values()].reduce((sum, s) => sum + s.size, 0) / distinctDaysObserved
      : 0
  const avgDailyHours =
    distinctDaysObserved > 0
      ? [...perDayHours.values()].reduce((sum, h) => sum + h, 0) / distinctDaysObserved
      : 0
  const overtimePerStaff = activeStaff > 0 ? totalOvertime / activeStaff : 0

  const inputs: ModelInputs = {
    activeStaff,
    lookbackDays: LOOKBACK_DAYS,
    distinctDaysObserved,
    avgDailyHeadcount,
    avgDailyHours,
    totalOvertime,
    overtimePerStaff,
    horizonDays,
    perMemberOvertime,
    latestDate,
  }

  // 4. Model — heuristic baseline, optionally refined by an LLM.
  const base = heuristicForecast(inputs)
  const draft = await llmForecast(inputs, base)

  // 5. Persist the forecast snapshot.
  const forecastDate = new Date().toISOString().slice(0, 10)
  const { data: forecast, error: fErr } = await supabase
    .from('labour_forecasts')
    .insert({
      auth0_org_id: orgId,
      site_id: siteId,
      forecast_date: forecastDate,
      horizon_days: horizonDays,
      predicted_required_staff: draft.predicted_required_staff,
      predicted_hours: draft.predicted_hours,
      demand_score: draft.demand_score,
      confidence: draft.confidence,
      model: draft.model,
      reasoning: draft.reasoning,
      input_summary: {
        active_staff: activeStaff,
        avg_daily_headcount: round2(avgDailyHeadcount),
        avg_daily_hours: round2(avgDailyHours),
        total_overtime: round2(totalOvertime),
        observed_days: distinctDaysObserved,
        lookback_days: LOOKBACK_DAYS,
      },
      generated_by: generatedBy,
    })
    .select('*')
    .single()

  if (fErr || !forecast) {
    return new Response(JSON.stringify({ error: fErr?.message ?? 'Failed to store forecast.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Persist derived alerts (best-effort; a forecast without alerts is still valid).
  let alerts: unknown[] = []
  if (draft.alerts.length > 0) {
    const rows = draft.alerts.map((a) => ({
      auth0_org_id: orgId,
      forecast_id: forecast.id,
      site_id: siteId,
      auth0_user_id: a.auth0_user_id,
      alert_type: a.alert_type,
      severity: a.severity,
      status: 'open' as const,
      target_date: a.target_date,
      title: a.title,
      detail: a.detail,
      recommended_action: a.recommended_action,
      metrics: a.metrics,
    }))
    const { data: inserted, error: aErr } = await supabase
      .from('labour_alerts')
      .insert(rows)
      .select('*')
    if (!aErr && inserted) alerts = inserted
  }

  return new Response(JSON.stringify({ forecast, alerts }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

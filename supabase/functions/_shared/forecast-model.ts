// Labour forecasting model — pure, dependency-free, unit-testable.
//
// Pipeline:
//   raw attendance rows
//     -> dense daily series (missing days filled)
//     -> MAD outlier clipping
//     -> Holt damped-trend level/trend on daily hours
//     -> multiplicative day-of-week seasonality
//     -> baseline daily forecast + p10/p90 prediction interval
//     -> deterministic BCEA-aware alert rules

export interface AttendanceRow {
  id: string
  auth0_org_id: string
  auth0_user_id: string
  method: string
  date: string // YYYY-MM-DD
  hours_worked: number | null
  overtime: number | null
  department_id: string | null
  status: string | null
  site_id: string | null
}

export interface PlannedShift {
  auth0_org_id: string
  auth0_user_id: string
  start_at: string
  end_at: string
  department_id: string | null
  site_id: string | null
}

export type AlertType =
  'overtime_risk' | 'staffing_shortage' | 'understaffed_shift' | 'burnout_risk'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface DraftAlert {
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  detail: string
  recommended_action: string
  auth0_user_id: string | null
  target_date: string | null
  metrics: Record<string, number | string | null>
}

export interface DayForecast {
  date: string
  predicted_hours: number
  p10: number
  p90: number
  predicted_required_staff: number
  demand_score: number
  dow_index: number
}

export interface DailyObservation {
  date: string
  headcount: number
  hours: number
  overtime: number
  late: number
  absent: number
}

export interface ModelFeatures {
  lookback_days: number
  observed_days: number
  active_staff: number
  avg_daily_headcount: number
  avg_daily_hours: number
  median_daily_hours: number
  total_overtime: number
  overtime_per_staff: number
  avg_shift_length: number
  utilisation: number
  level: number
  trend: number
  residual_sigma: number
  dow_index: number[] // Sunday..Saturday
  daily_actuals: DailyObservation[]
  planned_upcoming: { date: string; planned_hours: number; assignments: number }[]
  top_employees_by_hours: {
    employee_id: string
    name: string
    total_hours: number
    total_overtime: number
    days_worked: number
  }[]
}

export interface ForecastOutput {
  daily: DayForecast[]
  alerts: DraftAlert[]
  confidence: number
  model: string
  reasoning: string
  features: ModelFeatures
}

export interface ModelInput {
  attendance: AttendanceRow[]
  planned: PlannedShift[]
  activeStaff: number
  today: string // YYYY-MM-DD
  horizonDays: number
  lookbackDays?: number
}

/* ── numeric helpers ─────────────────────────────────────────────────────── */

export const round1 = (n: number) => Math.round(n * 10) / 10
export const round2 = (n: number) => Math.round(n * 100) / 100
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Median absolute deviation, scaled to be a consistent sigma estimator. */
export function mad(values: number[]): number {
  if (values.length === 0) return 0
  const m = median(values)
  return 1.4826 * median(values.map((v) => Math.abs(v - m)))
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function dayOfWeek(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay()
}

/* ── series construction ─────────────────────────────────────────────────── */

/** Dense daily series over [today - lookback + 1, today], zero-filled. */
export function buildDailySeries(
  attendance: AttendanceRow[],
  today: string,
  lookbackDays: number
): DailyObservation[] {
  const byDate = new Map<string, DailyObservation>()
  for (let i = lookbackDays - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    byDate.set(date, { date, headcount: 0, hours: 0, overtime: 0, late: 0, absent: 0 })
  }
  for (const r of attendance) {
    const day = byDate.get(r.date)
    if (!day) continue
    const hrs = Number(r.hours_worked ?? 0)
    day.hours += hrs
    day.overtime += Number(r.overtime ?? 0)
    if (r.status === 'absent' || r.status === 'leave' || r.status === 'sick_leave') day.absent += 1
    else {
      day.headcount += 1
      if (r.status === 'late') day.late += 1
    }
  }
  return Array.from(byDate.values())
}

/**
 * Clip values beyond `k` scaled MADs from the median (holidays, bad data).
 * When the MAD collapses to zero (very repetitive series), fall back to the
 * mean absolute deviation so a lone spike is still tamed.
 */
export function clipOutliers(values: number[], k = 3): number[] {
  if (values.length === 0) return []
  const m = median(values)
  let spread = mad(values)
  if (spread === 0) {
    spread = values.reduce((a, v) => a + Math.abs(v - m), 0) / values.length
  }
  if (spread === 0) return [...values]
  return values.map((v) => clamp(v, m - k * spread, m + k * spread))
}

/** Multiplicative day-of-week indices (Sun..Sat), normalised to mean 1. */
export function seasonalIndices(series: DailyObservation[], values: number[]): number[] {
  const overall = values.reduce((a, b) => a + b, 0) / (values.length || 1)
  if (overall <= 0) return new Array(7).fill(1)

  // Ratio to centred 7-day moving average, falling back to the overall mean
  // when the window is incomplete at the edges.
  const ratios: number[][] = Array.from({ length: 7 }, () => [])
  for (let i = 0; i < series.length; i++) {
    let base = overall
    if (i >= 3 && i <= series.length - 4) {
      let sum = 0
      for (let j = i - 3; j <= i + 3; j++) sum += values[j]
      base = sum / 7
    }
    if (base <= 0) continue
    ratios[dayOfWeek(series[i].date)].push(values[i] / base)
  }

  const raw = ratios.map((r) => (r.length ? median(r) : 1))
  const mean = raw.reduce((a, b) => a + b, 0) / 7
  if (mean <= 0) return new Array(7).fill(1)
  // Shrink toward 1 when history is thin — avoids wild weekly swings.
  const weight = clamp(series.length / 28, 0, 1)
  return raw.map((v) => 1 + (v / mean - 1) * weight)
}

export interface HoltState {
  level: number
  trend: number
  fitted: number[]
}

/** Holt linear trend with damping (alpha/beta/phi tuned for noisy daily ops data). */
export function holt(values: number[], alpha = 0.3, beta = 0.1, phi = 0.9): HoltState {
  if (values.length === 0) return { level: 0, trend: 0, fitted: [] }
  let level = values[0]
  let trend = values.length > 1 ? values[1] - values[0] : 0
  const fitted: number[] = [level]
  for (let i = 1; i < values.length; i++) {
    const forecast = level + phi * trend
    fitted.push(forecast)
    const prevLevel = level
    level = alpha * values[i] + (1 - alpha) * forecast
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend
  }
  return { level, trend, fitted }
}

/* ── main entry point ────────────────────────────────────────────────────── */

export function runForecast(input: ModelInput): ForecastOutput {
  const lookbackDays = input.lookbackDays ?? 56
  const { attendance, planned, activeStaff, today, horizonDays } = input

  const series = buildDailySeries(attendance, today, lookbackDays)
  const rawHours = series.map((d) => d.hours)
  const observedDays = series.filter((d) => d.headcount > 0 || d.hours > 0).length

  const cleanedHours = clipOutliers(rawHours)
  const dowIndex = seasonalIndices(series, cleanedHours)

  // Deseasonalise before fitting the trend, so weekly rhythm isn't absorbed.
  const deseasonalised = cleanedHours.map((v, i) => {
    const idx = dowIndex[dayOfWeek(series[i].date)] || 1
    return v / idx
  })
  const { level, trend, fitted } = holt(deseasonalised)

  const residuals = deseasonalised.map((v, i) => v - (fitted[i] ?? v))
  const residualSigma = Math.max(mad(residuals), 0.05 * Math.abs(level))

  const headcounts = series.map((d) => d.headcount)
  const avgDailyHeadcount = headcounts.reduce((a, b) => a + b, 0) / (series.length || 1)
  const medianHeadcount = median(headcounts.filter((h) => h > 0))
  const avgDailyHours = rawHours.reduce((a, b) => a + b, 0) / (series.length || 1)
  const totalHours = rawHours.reduce((a, b) => a + b, 0)
  const totalHeadcount = headcounts.reduce((a, b) => a + b, 0)
  const avgShiftLength = totalHeadcount > 0 ? totalHours / totalHeadcount : 8
  const totalOvertime = series.reduce((a, d) => a + d.overtime, 0)
  const overtimePerStaff = activeStaff > 0 ? totalOvertime / activeStaff : 0
  const utilisation = activeStaff > 0 ? avgDailyHeadcount / activeStaff : 0

  // Per-employee rollups
  const perEmployee = new Map<
    string,
    { name: string; hours: number; overtime: number; days: number; longDayDates: string[] }
  >()
  for (const r of attendance) {
    const e = perEmployee.get(r.auth0_user_id) ?? {
      name: r.full_name ?? 'Unknown',
      hours: 0,
      overtime: 0,
      days: 0,
      longDayDates: [],
    }
    const hrs = Number(r.hours_worked ?? 0)
    e.hours += hrs
    e.overtime += Number(r.overtime ?? 0)
    if (r.status !== 'absent') e.days += 1
    if (hrs > 9) e.longDayDates.push(r.date)
    perEmployee.set(r.auth0_user_id, e)
  }

  // Planned roster hours per upcoming day
  const plannedDaily = new Map<string, { hours: number; assignments: number }>()
  for (const s of planned) {
    const d = s.start_at.slice(0, 10)
    const hrs = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / 3_600_000
    const cur = plannedDaily.get(d) ?? { hours: 0, assignments: 0 }
    cur.hours += Number.isFinite(hrs) ? hrs : 0
    cur.assignments += 1
    plannedDaily.set(d, cur)
  }

  /* ── baseline forecast ─────────────────────────────────────────────────── */

  const daily: DayForecast[] = []
  for (let h = 1; h <= horizonDays; h++) {
    const date = addDays(today, h)
    const idx = dowIndex[dayOfWeek(date)] || 1
    // Damped trend accumulation: sum of phi^k for k=1..h
    const phi = 0.9
    let damp = 0
    for (let k = 1; k <= h; k++) damp += Math.pow(phi, k)
    const base = Math.max(level + damp * trend, 0)
    const point = Math.max(base * idx, 0)
    // Interval widens with the square root of the horizon.
    const spread = 1.2816 * residualSigma * Math.sqrt(h) * idx

    const requiredStaff = Math.max(Math.ceil(point / (avgShiftLength || 8)), point > 0 ? 1 : 0)

    const overtimePressure = clamp(overtimePerStaff / 5, 0, 1)
    const relDemand = avgDailyHours > 0 ? point / avgDailyHours : 0
    const demandScore = round2(clamp(relDemand * 5 + utilisation * 2 + overtimePressure * 3, 0, 10))

    daily.push({
      date,
      predicted_hours: round1(point),
      p10: round1(Math.max(point - spread, 0)),
      p90: round1(point + spread),
      predicted_required_staff: requiredStaff,
      demand_score: demandScore,
      dow_index: round2(idx),
    })
  }

  // Confidence: more observed history + tighter residuals => higher confidence.
  const noiseRatio = level > 0 ? residualSigma / level : 1
  const confidence = round2(
    clamp(
      0.35 + (observedDays / lookbackDays) * 0.4 + (1 - clamp(noiseRatio, 0, 1)) * 0.25,
      0.3,
      0.95
    )
  )

  /* ── deterministic alert rules ─────────────────────────────────────────── */

  const alerts: DraftAlert[] = []

  // 1. Staffing shortage — predicted staff exceeds available active staff.
  for (const d of daily) {
    if (activeStaff > 0 && d.predicted_required_staff > activeStaff) {
      const gap = d.predicted_required_staff - activeStaff
      alerts.push({
        alert_type: 'staffing_shortage',
        severity: gap >= 3 ? 'high' : 'medium',
        title: `Projected shortfall of ${gap} staff on ${d.date}`,
        detail: `Forecast requires ~${d.predicted_required_staff} staff (${d.predicted_hours}h) but only ${activeStaff} active employees are available.`,
        recommended_action:
          'Schedule additional shifts, approve planned overtime, or arrange temporary cover.',
        employee_id: null,
        target_date: d.date,
        metrics: {
          predicted_required_staff: d.predicted_required_staff,
          active_staff: activeStaff,
          gap,
        },
      })
    }
  }

  // 2. Understaffed shift — planned roster hours below the p10 of demand.
  for (const d of daily) {
    const p = plannedDaily.get(d.date)
    if (!p || d.p10 <= 0) continue
    if (p.hours < d.p10) {
      const shortfall = round1(d.p10 - p.hours)
      alerts.push({
        alert_type: 'understaffed_shift',
        severity: shortfall > d.p10 * 0.4 ? 'high' : 'medium',
        title: `Roster ${shortfall}h short on ${d.date}`,
        detail: `Only ${round1(p.hours)}h rostered across ${p.assignments} shift(s), below the low-end demand estimate of ${d.p10}h (mid ${d.predicted_hours}h).`,
        recommended_action:
          'Add shifts or extend existing ones to cover the projected demand floor.',
        employee_id: null,
        target_date: d.date,
        metrics: { planned_hours: round1(p.hours), p10: d.p10, shortfall },
      })
    }
  }

  // 3. Overtime risk — BCEA: >10h overtime per week is the statutory cap.
  const weeks = Math.max(lookbackDays / 7, 1)
  const orgOtPerHeadPerWeek = overtimePerStaff / weeks
  if (orgOtPerHeadPerWeek >= 5) {
    alerts.push({
      alert_type: 'overtime_risk',
      severity: orgOtPerHeadPerWeek >= 8 ? 'critical' : 'high',
      title: 'Organisation-wide overtime trend elevated',
      detail: `Average overtime is ${round1(orgOtPerHeadPerWeek)}h per employee per week over the last ${lookbackDays} days (BCEA cap: 10h/week).`,
      recommended_action:
        'Rebalance rosters and review whether headcount matches demand before approving more overtime.',
      employee_id: null,
      target_date: daily[0]?.date ?? null,
      metrics: {
        overtime_per_head_per_week: round1(orgOtPerHeadPerWeek),
        total_overtime: round1(totalOvertime),
      },
    })
  }

  for (const [auth0_user_id, e] of perEmployee) {
    const otPerWeek = e.overtime / weeks
    if (otPerWeek >= 10) {
      alerts.push({
        alert_type: 'overtime_risk',
        severity: 'critical',
        title: `${e.name} is over the BCEA overtime cap`,
        detail: `${round1(otPerWeek)}h overtime per week averaged over ${lookbackDays} days (statutory maximum is 10h/week).`,
        recommended_action:
          'Stop scheduling overtime for this employee and redistribute the workload immediately.',
        employee_id: auth0_user_id,
        target_date: daily[0]?.date ?? null,
        metrics: { overtime_per_week: round1(otPerWeek), total_overtime: round1(e.overtime) },
      })
    } else if (otPerWeek >= 7) {
      alerts.push({
        alert_type: 'overtime_risk',
        severity: 'high',
        title: `${e.name} approaching the overtime cap`,
        detail: `${round1(otPerWeek)}h overtime per week averaged over ${lookbackDays} days (cap 10h/week).`,
        recommended_action:
          'Cap further overtime for this employee this week and share the load across the team.',
        employee_id: auth0_user_id,
        target_date: daily[0]?.date ?? null,
        metrics: { overtime_per_week: round1(otPerWeek) },
      })
    }

    // 4. Burnout risk — 3+ consecutive days over 9 hours worked.
    const streak = longestConsecutiveRun(e.longDayDates)
    if (streak >= 3) {
      alerts.push({
        alert_type: 'burnout_risk',
        severity: streak >= 5 ? 'critical' : 'high',
        title: `${e.name} worked ${streak} consecutive long days`,
        detail: `${streak} consecutive days above 9 hours worked in the last ${lookbackDays} days.`,
        recommended_action:
          'Schedule a rest day and confirm wellbeing before assigning further shifts.',
        employee_id: auth0_user_id,
        target_date: daily[0]?.date ?? null,
        metrics: { consecutive_long_days: streak, total_hours: round1(e.hours) },
      })
    }
  }

  const topEmployees = Array.from(perEmployee.entries())
    .map(([id, v]) => ({
      employee_id: id,
      name: v.name,
      total_hours: round1(v.hours),
      total_overtime: round1(v.overtime),
      days_worked: v.days,
    }))
    .sort((a, b) => b.total_hours - a.total_hours)
    .slice(0, 20)

  const features: ModelFeatures = {
    lookback_days: lookbackDays,
    observed_days: observedDays,
    active_staff: activeStaff,
    avg_daily_headcount: round2(avgDailyHeadcount),
    avg_daily_hours: round1(avgDailyHours),
    median_daily_hours: round1(median(rawHours)),
    total_overtime: round1(totalOvertime),
    overtime_per_staff: round2(overtimePerStaff),
    avg_shift_length: round2(avgShiftLength || 8),
    utilisation: round2(utilisation),
    level: round2(level),
    trend: round2(trend),
    residual_sigma: round2(residualSigma),
    dow_index: dowIndex.map(round2),
    daily_actuals: series.map((d) => ({
      ...d,
      hours: round1(d.hours),
      overtime: round1(d.overtime),
    })),
    planned_upcoming: Array.from(plannedDaily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, planned_hours: round1(v.hours), assignments: v.assignments })),
    top_employees_by_hours: topEmployees,
  }

  const reasoning =
    `Baseline model over ${observedDays}/${lookbackDays} observed day(s): level ${round1(level)}h/day, ` +
    `trend ${round2(trend)}h/day, weekly seasonality peak ${round2(Math.max(...dowIndex))}x, ` +
    `avg headcount ${round1(avgDailyHeadcount)} of ${activeStaff} active, ` +
    `${round1(orgOtPerHeadPerWeek)}h overtime/employee/week. ` +
    `${alerts.length} risk(s) detected. Median day-1 fallback ${round1(median(rawHours))}h.`

  // Median headcount acts as a floor so a quiet fitted level never suggests
  // fewer staff than the site has consistently been running.
  if (medianHeadcount > 0) {
    for (const d of daily) {
      d.predicted_required_staff = Math.max(
        d.predicted_required_staff,
        Math.round(medianHeadcount * (d.dow_index >= 0.5 ? Math.min(d.dow_index, 1) : 0))
      )
    }
  }

  return {
    daily,
    alerts,
    confidence,
    model: 'baseline-v1',
    reasoning,
    features,
  }
}

/** Longest run of consecutive calendar dates in an unsorted date list. */
export function longestConsecutiveRun(dates: string[]): number {
  if (dates.length === 0) return 0
  const uniq = Array.from(new Set(dates)).sort()
  let best = 1
  let run = 1
  for (let i = 1; i < uniq.length; i++) {
    if (addDays(uniq[i - 1], 1) === uniq[i]) run += 1
    else run = 1
    if (run > best) best = run
  }
  return best
}

/* ── AI refinement bounds ────────────────────────────────────────────────── */

export const AI_MIN_FACTOR = 0.75
export const AI_MAX_FACTOR = 1.25

export interface AiAdjustment {
  date: string
  factor: number
  note?: string
}

/**
 * Apply bounded AI adjustments to the baseline. Any out-of-range or unknown
 * date is ignored, so a bad model response can never distort the forecast.
 */
export function applyAiAdjustments(
  daily: DayForecast[],
  adjustments: AiAdjustment[]
): { daily: DayForecast[]; applied: number } {
  const byDate = new Map(adjustments.map((a) => [a.date, a]))
  let applied = 0
  const out = daily.map((d) => {
    const adj = byDate.get(d.date)
    const factor = Number(adj?.factor)
    if (!adj || !Number.isFinite(factor) || factor < AI_MIN_FACTOR || factor > AI_MAX_FACTOR) {
      return d
    }
    applied += 1
    const hours = round1(d.predicted_hours * factor)
    return {
      ...d,
      predicted_hours: hours,
      p10: round1(d.p10 * factor),
      p90: round1(d.p90 * factor),
      predicted_required_staff: Math.max(1, Math.round(d.predicted_required_staff * factor)),
    }
  })
  return { daily: out, applied }
}

/* ── accuracy / backtesting ──────────────────────────────────────────────── */

export interface AccuracyPoint {
  date: string
  predicted_hours: number
  actual_hours: number
  predicted_staff: number
  actual_staff: number
}

export interface AccuracyResult {
  sample_days: number
  hours_mae: number
  hours_mape: number
  staff_mae: number
  accuracy_pct: number
  points: AccuracyPoint[]
}

export function evaluateAccuracy(points: AccuracyPoint[]): AccuracyResult {
  const usable = points.filter((p) => p.actual_hours > 0)
  if (usable.length === 0) {
    return {
      sample_days: 0,
      hours_mae: 0,
      hours_mape: 0,
      staff_mae: 0,
      accuracy_pct: 0,
      points,
    }
  }
  const hoursAbs = usable.map((p) => Math.abs(p.predicted_hours - p.actual_hours))
  const pct = usable.map((p) => Math.abs(p.predicted_hours - p.actual_hours) / p.actual_hours)
  const staffAbs = usable.map((p) => Math.abs(p.predicted_staff - p.actual_staff))
  const mape = (pct.reduce((a, b) => a + b, 0) / usable.length) * 100
  return {
    sample_days: usable.length,
    hours_mae: round1(hoursAbs.reduce((a, b) => a + b, 0) / usable.length),
    hours_mape: round1(mape),
    staff_mae: round1(staffAbs.reduce((a, b) => a + b, 0) / usable.length),
    accuracy_pct: round1(clamp(100 - mape, 0, 100)),
    points: usable,
  }
}

// Payroll Export Pro — generation edge function.
//
// Responsibilities (generation ONLY; export history reads live in the Express
// router server/routes/payroll-export.ts):
//   1. Authenticate the caller. The browser holds no Auth0 token in this app, so
//      the primary caller is the Express proxy presenting a shared secret plus a
//      trusted org_id. A direct Auth0 Bearer call is supported as a fallback.
//   2. Enforce the "payroll export" plan gate (pro | enterprise) server-side,
//      mirroring the frontend feature flag.
//   3. Build a BCEA-style pay register for a pay period from org_attendance
//      (daily aggregate) joined to org_members pay attributes:
//        * Overtime at 1.5x (from the attendance `overtime` column).
//        * Sunday hours earn a +1x premium (2x effective), derived from the
//          attendance `date` day-of-week. Public holidays are not modelled.
//        * PAYE + UIF are ESTIMATES (annualised SARS 2024/25 brackets + primary
//          rebate; UIF 1% capped at the monthly remuneration ceiling).
//   4. Emit five best-effort export layouts (Full CSV, Sage, Xero, PaySpace,
//      SARS EMP201) and persist one payroll_export_runs audit row.

import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth0 } from '../_shared/auth0.ts'

// Plans that unlock payroll export. Mirrors src/lib/feature-flags.ts and the
// Express plan gate (server/routes/payroll-export.ts).
const FULL_PAYROLL_PLANS = new Set(['pro', 'enterprise'])

// SA statutory constants (2024/25 tax year) — used for estimates only.
const OVERTIME_MULTIPLIER = 1.5
const SUNDAY_PREMIUM_MULTIPLIER = 1 // extra on top of ordinary => 2x effective
const UIF_RATE = 0.01
const UIF_MONTHLY_CEILING = 17712 // max remuneration for UIF (=> R177.12 cap)
const PRIMARY_REBATE = 17235 // annual primary rebate

type ExportFormat = 'full' | 'sage' | 'xero' | 'payspace' | 'sars_emp201'
const EXPORT_FORMATS: ExportFormat[] = ['full', 'sage', 'xero', 'payspace', 'sars_emp201']

interface MemberRow {
  auth0_user_id: string
  hourly_rate: number | null
  tax_number: string | null
  employee_code: string | null
  employment_type: string | null
}

interface AttendanceRow {
  auth0_user_id: string
  date: string
  hours_worked: number | null
  overtime: number | null
}

interface RegisterLine {
  auth0_user_id: string
  employee_code: string
  name: string
  tax_number: string
  hourly_rate: number
  ordinary_hours: number
  overtime_hours: number
  sunday_hours: number
  ordinary_pay: number
  overtime_pay: number
  sunday_pay: number
  gross: number
  paye: number
  uif: number
  net: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// SARS 2024/25 annual PAYE, before rebates.
function annualTaxBeforeRebate(annual: number): number {
  if (annual <= 237100) return annual * 0.18
  if (annual <= 370500) return 42678 + (annual - 237100) * 0.26
  if (annual <= 512800) return 77362 + (annual - 370500) * 0.31
  if (annual <= 673000) return 121475 + (annual - 512800) * 0.36
  if (annual <= 857900) return 179147 + (annual - 673000) * 0.39
  if (annual <= 1817000) return 251258 + (annual - 857900) * 0.41
  return 644489 + (annual - 1817000) * 0.45
}

// Monthly PAYE estimate from a single pay-period gross (annualised x12).
function estimateMonthlyPaye(gross: number): number {
  const annual = gross * 12
  const annualTax = Math.max(0, annualTaxBeforeRebate(annual) - PRIMARY_REBATE)
  return round2(annualTax / 12)
}

function estimateUif(gross: number): number {
  return round2(Math.min(gross, UIF_MONTHLY_CEILING) * UIF_RATE)
}

function isSunday(iso: string): boolean {
  return new Date(iso + 'T00:00:00Z').getUTCDay() === 0
}

// ── CSV helpers ─────────────────────────────────────────────────────────────
function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) lines.push(row.map(csvCell).join(','))
  return lines.join('\r\n')
}

// ── Register computation ────────────────────────────────────────────────────
function buildRegister(
  members: MemberRow[],
  attendance: AttendanceRow[],
  names: Record<string, string>
): RegisterLine[] {
  const byMember = new Map<string, MemberRow>()
  for (const m of members) byMember.set(m.auth0_user_id, m)

  const agg = new Map<string, { ordinary: number; overtime: number; sunday: number }>()
  for (const row of attendance) {
    const worked = Number(row.hours_worked ?? 0)
    const ot = Number(row.overtime ?? 0)
    const ordinary = Math.max(0, worked - ot)
    const cur = agg.get(row.auth0_user_id) ?? { ordinary: 0, overtime: 0, sunday: 0 }
    cur.ordinary += ordinary
    cur.overtime += ot
    if (isSunday(row.date)) cur.sunday += worked
    agg.set(row.auth0_user_id, cur)
  }

  const lines: RegisterLine[] = []
  for (const [userId, hours] of agg) {
    const member = byMember.get(userId)
    // Only pay members we have an active pay record for.
    if (!member) continue
    const rate = Number(member.hourly_rate ?? 0)

    const ordinaryPay = round2(hours.ordinary * rate)
    const overtimePay = round2(hours.overtime * rate * OVERTIME_MULTIPLIER)
    const sundayPay = round2(hours.sunday * rate * SUNDAY_PREMIUM_MULTIPLIER)
    const gross = round2(ordinaryPay + overtimePay + sundayPay)
    const paye = estimateMonthlyPaye(gross)
    const uif = estimateUif(gross)
    const net = round2(gross - paye - uif)

    lines.push({
      auth0_user_id: userId,
      employee_code: member.employee_code ?? userId.slice(-8),
      name: names[userId] ?? 'Unknown',
      tax_number: member.tax_number ?? '',
      hourly_rate: rate,
      ordinary_hours: round2(hours.ordinary),
      overtime_hours: round2(hours.overtime),
      sunday_hours: round2(hours.sunday),
      ordinary_pay: ordinaryPay,
      overtime_pay: overtimePay,
      sunday_pay: sundayPay,
      gross,
      paye,
      uif,
      net,
    })
  }

  lines.sort((a, b) => a.name.localeCompare(b.name))
  return lines
}

// ── Export layouts (best-effort standard templates) ─────────────────────────
function buildFormats(
  register: RegisterLine[],
  period: { start: string; end: string }
): Record<ExportFormat, string> {
  const full = toCsv(
    [
      'Employee Code',
      'Employee Name',
      'Tax Number',
      'Hourly Rate',
      'Ordinary Hours',
      'Overtime Hours',
      'Sunday Hours',
      'Ordinary Pay',
      'Overtime Pay',
      'Sunday Pay',
      'Gross Pay',
      'PAYE',
      'UIF',
      'Net Pay',
    ],
    register.map((r) => [
      r.employee_code,
      r.name,
      r.tax_number,
      r.hourly_rate.toFixed(2),
      r.ordinary_hours,
      r.overtime_hours,
      r.sunday_hours,
      r.ordinary_pay.toFixed(2),
      r.overtime_pay.toFixed(2),
      r.sunday_pay.toFixed(2),
      r.gross.toFixed(2),
      r.paye.toFixed(2),
      r.uif.toFixed(2),
      r.net.toFixed(2),
    ])
  )

  // Sage Pastel Payroll — generic component import layout.
  const sage = toCsv(
    [
      'Employee Code',
      'Employee Name',
      'Basic Pay',
      'Overtime Pay',
      'Sunday Pay',
      'PAYE',
      'UIF',
      'Net Pay',
    ],
    register.map((r) => [
      r.employee_code,
      r.name,
      r.ordinary_pay.toFixed(2),
      r.overtime_pay.toFixed(2),
      r.sunday_pay.toFixed(2),
      r.paye.toFixed(2),
      r.uif.toFixed(2),
      r.net.toFixed(2),
    ])
  )

  // Xero Payroll — earnings/summary lines.
  const xero = toCsv(
    ['Employee', 'Earnings Rate', 'Ordinary Hours', 'Overtime Hours', 'Gross', 'Net'],
    register.map((r) => [
      r.name,
      'Ordinary Time',
      r.ordinary_hours,
      r.overtime_hours,
      r.gross.toFixed(2),
      r.net.toFixed(2),
    ])
  )

  // PaySpace — bulk earnings import.
  const payspace = toCsv(
    [
      'Employee Number',
      'Tax Reference',
      'Ordinary Hours',
      'Overtime Hours',
      'Gross Earnings',
      'PAYE',
      'UIF',
      'Net Pay',
    ],
    register.map((r) => [
      r.employee_code,
      r.tax_number,
      r.ordinary_hours,
      r.overtime_hours,
      r.gross.toFixed(2),
      r.paye.toFixed(2),
      r.uif.toFixed(2),
      r.net.toFixed(2),
    ])
  )

  // SARS EMP201 — monthly employer declaration summary (org-level totals).
  const payeTotal = round2(register.reduce((s, r) => s + r.paye, 0))
  const uifEmployee = round2(register.reduce((s, r) => s + r.uif, 0))
  const grossTotal = round2(register.reduce((s, r) => s + r.gross, 0))
  const uifTotal = round2(uifEmployee * 2) // employee + employer 1% each
  // SDL (1% of payroll) applies only when annual payroll > R500k — estimated.
  const sdl = grossTotal * 12 > 500000 ? round2(grossTotal * 0.01) : 0
  const totalLiability = round2(payeTotal + uifTotal + sdl)
  const emp201 = toCsv(
    ['Field', 'Value'],
    [
      ['Period Start', period.start],
      ['Period End', period.end],
      ['Number of Employees', register.length],
      ['PAYE', payeTotal.toFixed(2)],
      ['UIF (employer + employee)', uifTotal.toFixed(2)],
      ['SDL', sdl.toFixed(2)],
      ['Total Liability', totalLiability.toFixed(2)],
    ]
  )

  return { full, sage, xero, payspace, sars_emp201: emp201 }
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

  // 1. Authenticate — shared secret (Express proxy) or Auth0 Bearer fallback.
  const body = (await req.json().catch(() => ({}))) as {
    org_id?: string
    period_start?: string
    period_end?: string
    format?: ExportFormat
  }

  const sharedSecret = Deno.env.get('PAYROLL_FN_SECRET')
  const presentedSecret = req.headers.get('x-payroll-secret')
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

  const periodStart = typeof body.period_start === 'string' ? body.period_start : ''
  const periodEnd = typeof body.period_end === 'string' ? body.period_end : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    return new Response(
      JSON.stringify({ error: 'period_start and period_end (YYYY-MM-DD) are required.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const format: ExportFormat = EXPORT_FORMATS.includes(body.format as ExportFormat)
    ? (body.format as ExportFormat)
    : 'full'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // 2. Plan gate.
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
  if (!org || !FULL_PAYROLL_PLANS.has(String(org.plan))) {
    return new Response(
      JSON.stringify({ error: 'Payroll Export Pro requires a Business (Pro) or Enterprise plan.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 3. Load pay attributes, names, and attendance for the period.
  const { data: memberData, error: mErr } = await supabase
    .from('org_members')
    .select('auth0_user_id, hourly_rate, tax_number, employee_code, employment_type')
    .eq('auth0_org_id', orgId)
    .eq('status', 'active')
  if (mErr) {
    return new Response(JSON.stringify({ error: mErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: userData, error: uErr } = await supabase
    .from('users')
    .select('auth0_user_id, full_name')
    .eq('auth0_org_id', orgId)
  if (uErr) {
    return new Response(JSON.stringify({ error: uErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: attData, error: aErr } = await supabase
    .from('org_attendance')
    .select('auth0_user_id, date, hours_worked, overtime')
    .eq('auth0_org_id', orgId)
    .gte('date', periodStart)
    .lte('date', periodEnd)
  if (aErr) {
    return new Response(JSON.stringify({ error: aErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const names: Record<string, string> = {}
  for (const u of (userData ?? []) as { auth0_user_id: string; full_name: string | null }[]) {
    names[u.auth0_user_id] = u.full_name ?? 'Unknown'
  }

  const register = buildRegister(
    (memberData ?? []) as MemberRow[],
    (attData ?? []) as AttendanceRow[],
    names
  )
  const formats = buildFormats(register, { start: periodStart, end: periodEnd })

  const summary = {
    employee_count: register.length,
    gross_total: round2(register.reduce((s, r) => s + r.gross, 0)),
    paye_total: round2(register.reduce((s, r) => s + r.paye, 0)),
    uif_total: round2(register.reduce((s, r) => s + r.uif, 0)),
    net_total: round2(register.reduce((s, r) => s + r.net, 0)),
    overtime_hours: round2(register.reduce((s, r) => s + r.overtime_hours, 0)),
    sunday_hours: round2(register.reduce((s, r) => s + r.sunday_hours, 0)),
  }

  // 4. Persist an audit run (best-effort; export still returns if this fails).
  await supabase.from('payroll_export_runs').insert({
    auth0_org_id: orgId,
    period_start: periodStart,
    period_end: periodEnd,
    format,
    employee_count: summary.employee_count,
    gross_total: summary.gross_total,
    paye_total: summary.paye_total,
    uif_total: summary.uif_total,
    net_total: summary.net_total,
    generated_by: generatedBy,
  })

  return new Response(
    JSON.stringify({
      period: { start: periodStart, end: periodEnd },
      summary,
      register,
      formats,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

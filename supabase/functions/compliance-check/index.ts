<<<<<<< Updated upstream
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
=======
/* eslint-disable @typescript-eslint/no-explicit-any */
import { corsHeaders } from '../_shared/cors.ts'
import { resolveAuthContext, requireRole } from '../_shared/auth-middleware.ts'
>>>>>>> Stashed changes

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v).getTime())
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.setDate(diff)).toISOString().split('T')[0]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const ctx = await resolveAuthContext(req).catch((r) => r)
    if (ctx instanceof Response) return ctx
    try {
      requireRole(ctx, 'admin', 'manager')
    } catch (r) {
      return r as Response
    }
    const { organisationId, adminClient: supabaseAdmin } = ctx

    // ── Validate week_start param ────────────────────────────────────────
    const url = new URL(req.url)
    const weekStart = url.searchParams.get('week_start') || getWeekStart()

    if (!isValidDate(weekStart)) {
      return jsonResponse({ error: 'Invalid week_start. Expected format: YYYY-MM-DD' }, 400)
    }

    const weekEndDate = new Date(weekStart)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const weekEnd = weekEndDate.toISOString().split('T')[0]

    // ── Scope to organisation's sites ────────────────────────────────────
    const { data: orgSites } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('organisation_id', organisationId)

    const orgSiteIds = (orgSites ?? []).map((s: any) => s.id)

    if (!orgSiteIds.length) {
      return jsonResponse({
        compliance_score: 100,
        total_checks: 0,
        pass_count: 0,
        violations: [],
        week_start: weekStart,
        week_end: weekEnd,
      })
    }

    // ── Fetch records (no cross-schema join) ─────────────────────────────
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('attendance_records')
      .select('id, employee_id, date, hours_worked, overtime, status')
      .in('site_id', orgSiteIds)
      .gte('date', weekStart)
      .lte('date', weekEnd)

    if (recordsError) {
      console.error('compliance-check records error:', recordsError)
      return jsonResponse(
        {
          error: 'Failed to fetch attendance records',
          details: recordsError.message,
        },
        500
      )
    }

    // ── Enrich with profile names (separate query) ───────────────────────
    const employeeIds = [...new Set((records ?? []).map((r: any) => r.employee_id as string))]
    const profileMap: Record<string, string> = {}

    if (employeeIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', employeeIds)

      for (const p of profiles ?? []) {
        profileMap[p.id] = p.full_name
      }
    }

    // ── Group by employee ────────────────────────────────────────────────
    const byEmployee: Record<
      string,
      {
        name: string
        totalHours: number
        totalOvertime: number
        workDays: Set<string>
      }
    > = {}

    for (const r of records ?? []) {
      const eid = r.employee_id
      if (!byEmployee[eid]) {
        byEmployee[eid] = {
          name: profileMap[eid] || 'Unknown',
          totalHours: 0,
          totalOvertime: 0,
          workDays: new Set(),
        }
      }
      byEmployee[eid].totalHours += r.hours_worked || 0
      byEmployee[eid].totalOvertime += r.overtime || 0
      if (r.date) byEmployee[eid].workDays.add(r.date)
    }

    // ── BCEA compliance checks (3 rules per employee) ────────────────────
    const violations: Array<{
      employee_id: string
      name: string
      rule: string
      detail: string
    }> = []
    let passCount = 0
    const CHECKS_PER_EMPLOYEE = 3

    for (const [eid, data] of Object.entries(byEmployee)) {
      // Rule 1 — max 45 hours/week
      if (data.totalHours > 45) {
        violations.push({
          employee_id: eid,
          name: data.name,
          rule: 'BCEA Max Weekly Hours',
          detail: `${data.totalHours.toFixed(1)}h exceeds 45h limit`,
        })
      } else passCount++

      // Rule 2 — max 10 hours overtime/week
      if (data.totalOvertime > 10) {
        violations.push({
          employee_id: eid,
          name: data.name,
          rule: 'BCEA Overtime Cap',
          detail: `${data.totalOvertime.toFixed(1)}h overtime exceeds 10h limit`,
        })
      } else passCount++

      // Rule 3 — max 6 consecutive days without rest
      if (data.workDays.size > 6) {
        violations.push({
          employee_id: eid,
          name: data.name,
          rule: 'BCEA Rest Period',
          detail: `${data.workDays.size} consecutive days worked without rest`,
        })
      } else passCount++
    }

    const totalChecks = Object.keys(byEmployee).length * CHECKS_PER_EMPLOYEE
    const complianceScore = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 100

    return jsonResponse({
      compliance_score: complianceScore,
      total_checks: totalChecks,
      pass_count: passCount,
      violations,
      week_start: weekStart,
      week_end: weekEnd,
    })
  } catch (err) {
    console.error('compliance-check unhandled error:', err)
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500)
  }
})

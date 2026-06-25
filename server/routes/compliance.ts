// GET /api/compliance
//
// Returns a basic working-time compliance summary for the current org, derived
// from org_attendance. Weekly ordinary-hours/overtime thresholds come from the
// organization's stored work rules (organizations.metadata.workRules). Member+.
import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

// Monday-based ISO week start (UTC) for a given date.
function weekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = (d.getUTCDay() + 6) % 7 // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().slice(0, 10)
}

router.get(
  '/api/compliance',
  requireAuth,
  requireOrg,
  requireRole('member'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('metadata')
      .eq('auth0_org_id', orgId)
      .maybeSingle()

    const workRules =
      ((org?.metadata as Record<string, unknown> | null)?.workRules as
        | { weeklyHoursLimit?: number }
        | undefined) ?? {}
    const weeklyLimit =
      typeof workRules.weeklyHoursLimit === 'number' ? workRules.weeklyHoursLimit : 45

    const { data: attendance, error } = await supabaseAdmin
      .from('org_attendance')
      .select('user_id, date, hours_worked, overtime')
      .eq('org_id', orgId)

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    // Aggregate hours per employee per week.
    const buckets = new Map<
      string,
      { employee_id: string; week_start: string; ordinary_hours: number; overtime_hours: number }
    >()
    for (const row of attendance ?? []) {
      const ws = weekStart(row.date)
      const key = `${row.user_id}:${ws}`
      const bucket = buckets.get(key) ?? {
        employee_id: row.user_id,
        week_start: ws,
        ordinary_hours: 0,
        overtime_hours: 0,
      }
      bucket.ordinary_hours += Number(row.hours_worked ?? 0)
      bucket.overtime_hours += Number(row.overtime ?? 0)
      buckets.set(key, bucket)
    }

    const violations = Array.from(buckets.values())
      .map((b) => {
        const reasons: string[] = []
        if (b.ordinary_hours > weeklyLimit) {
          reasons.push(`Exceeded weekly limit of ${weeklyLimit}h (${b.ordinary_hours}h worked)`)
        }
        return { ...b, reasons }
      })
      .filter((b) => b.reasons.length > 0)

    const totalChecks = buckets.size
    const passCount = totalChecks - violations.length
    const complianceScore = totalChecks === 0 ? 100 : Math.round((passCount / totalChecks) * 100)

    res.json({
      compliance_score: complianceScore,
      pass_count: passCount,
      total_checks: totalChecks,
      violations,
    })
  }
)

export default router

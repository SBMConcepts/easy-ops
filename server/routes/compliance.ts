// GET /api/compliance
//
// Returns a basic working-time compliance summary for the current org, derived
// from org_attendance. Weekly ordinary-hours/overtime thresholds come from the
// organization's stored work rules (organizations.metadata.workRules). Member+.
import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Json } from '../types/supabase.js'

const router = Router()

// Default statutory thresholds (South African BCEA baselines).
const DEFAULT_COMPLIANCE_CONFIG = {
  max_ordinary_hours_per_week: 45,
  max_overtime_hours_per_week: 10,
  lookback_weeks: 12,
}

type ComplianceConfig = typeof DEFAULT_COMPLIANCE_CONFIG

function readComplianceConfig(metadata: Record<string, unknown> | null): ComplianceConfig {
  const workRules = (metadata?.workRules as Record<string, unknown> | undefined) ?? {}
  const num = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return {
    max_ordinary_hours_per_week: num(
      workRules.max_ordinary_hours_per_week ?? workRules.weeklyHoursLimit,
      DEFAULT_COMPLIANCE_CONFIG.max_ordinary_hours_per_week
    ),
    max_overtime_hours_per_week: num(
      workRules.max_overtime_hours_per_week,
      DEFAULT_COMPLIANCE_CONFIG.max_overtime_hours_per_week
    ),
    lookback_weeks: num(workRules.lookback_weeks, DEFAULT_COMPLIANCE_CONFIG.lookback_weeks),
  }
}

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

// GET /api/compliance/config
//
// Returns the org's configured labour thresholds (stored in
// organizations.metadata.workRules). Admin+ only.
router.get(
  '/api/compliance/config',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('metadata')
      .eq('auth0_org_id', req.orgId!)
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.json(readComplianceConfig(org?.metadata as Record<string, unknown> | null))
  }
)

// PUT /api/compliance/config
//
// Persists the org's labour thresholds into organizations.metadata.workRules,
// keeping weeklyHoursLimit in sync so the summary endpoint reflects the change.
// Admin+ only.
router.put(
  '/api/compliance/config',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as Partial<ComplianceConfig>

    const num = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value : null
    const maxOrdinary = num(body.max_ordinary_hours_per_week)
    const maxOvertime = num(body.max_overtime_hours_per_week)
    const lookback = num(body.lookback_weeks)

    if (maxOrdinary === null || maxOvertime === null || lookback === null) {
      res.status(400).json({ error: 'All compliance thresholds must be valid numbers.' })
      return
    }

    const { data: currentOrg, error: readErr } = await supabaseAdmin
      .from('organizations')
      .select('metadata')
      .eq('auth0_org_id', orgId)
      .maybeSingle()
    if (readErr) {
      res.status(500).json({ error: readErr.message })
      return
    }

    const metadata = (currentOrg?.metadata as Record<string, unknown> | null) ?? {}
    const workRules = (metadata.workRules as Record<string, unknown> | undefined) ?? {}

    const mergedMetadata = {
      ...metadata,
      workRules: {
        ...workRules,
        max_ordinary_hours_per_week: maxOrdinary,
        max_overtime_hours_per_week: maxOvertime,
        lookback_weeks: lookback,
        weeklyHoursLimit: maxOrdinary,
      },
    }

    const { error: updateErr } = await supabaseAdmin
      .from('organizations')
      .update({ metadata: mergedMetadata as Json, updated_at: new Date().toISOString() })
      .eq('auth0_org_id', orgId)
    if (updateErr) {
      res.status(500).json({ error: updateErr.message })
      return
    }

    res.json({
      max_ordinary_hours_per_week: maxOrdinary,
      max_overtime_hours_per_week: maxOvertime,
      lookback_weeks: lookback,
    })
  }
)

export default router

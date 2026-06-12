/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Response } from 'express'
import { withTenantContext } from '../lib/db.js'
import { requireAuth0Auth, type AuthenticatedRequest } from '../lib/auth-middleware.js'

const router = Router()

// BCEA v1 weekly thresholds. A (employee, week) bucket is a "check"; it fails if
// either limit is exceeded. Driven here in code until a tenant-level config exists.
const MAX_ORDINARY_HOURS_PER_WEEK = 45
const MAX_OVERTIME_HOURS_PER_WEEK = 10
const LOOKBACK_WEEKS = 12

// GET /api/compliance — compute a labour-compliance summary for the tenant.
// Tenant scoping is enforced by RLS via withTenantContext, and RLS also limits
// employees to their own rows so the score reflects what each role may see.
router.get(
  '/api/compliance',
  requireAuth0Auth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const authCtx = req.auth!

      const rows = await withTenantContext(authCtx, async (client) => {
        const result = await client.query(
          `SELECT
             employee_id,
             date_trunc('week', date)::date          AS week_start,
             COALESCE(SUM(hours_worked), 0)::float    AS total_hours,
             COALESCE(SUM(overtime), 0)::float        AS overtime_hours
           FROM public.attendance_records
           WHERE date >= (CURRENT_DATE - ($1 || ' weeks')::interval)
           GROUP BY employee_id, date_trunc('week', date)`,
          [LOOKBACK_WEEKS]
        )
        return result.rows as Array<{
          employee_id: string
          week_start: string
          total_hours: number
          overtime_hours: number
        }>
      })

      const violations = rows
        .map((r) => {
          const ordinaryHours = Math.max(0, r.total_hours - r.overtime_hours)
          const reasons: string[] = []
          if (ordinaryHours > MAX_ORDINARY_HOURS_PER_WEEK) {
            reasons.push(
              `Ordinary hours ${ordinaryHours.toFixed(1)} exceed the ${MAX_ORDINARY_HOURS_PER_WEEK}h weekly limit`
            )
          }
          if (r.overtime_hours > MAX_OVERTIME_HOURS_PER_WEEK) {
            reasons.push(
              `Overtime ${r.overtime_hours.toFixed(1)}h exceeds the ${MAX_OVERTIME_HOURS_PER_WEEK}h weekly limit`
            )
          }
          return {
            employee_id: r.employee_id,
            week_start: r.week_start,
            ordinary_hours: Number(ordinaryHours.toFixed(2)),
            overtime_hours: Number(r.overtime_hours.toFixed(2)),
            reasons,
          }
        })
        .filter((v) => v.reasons.length > 0)

      const totalChecks = rows.length
      const passCount = totalChecks - violations.length
      const complianceScore = totalChecks === 0 ? 100 : Math.round((passCount / totalChecks) * 100)

      return res.status(200).json({
        compliance_score: complianceScore,
        pass_count: passCount,
        total_checks: totalChecks,
        violations,
      })
    } catch (error: any) {
      console.error('GET /api/compliance failed:', error)
      return res.status(500).json({ error: 'Failed to compute compliance.' })
    }
  }
)

export default router

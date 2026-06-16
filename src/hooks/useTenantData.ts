import { useQuery } from '@tanstack/react-query'
import { useDB } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../integrations/supabase/types'

type SiteRow = Database['public']['Tables']['sites']['Row']
type AttendanceRow = Database['public']['Tables']['attendance_records']['Row']

export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
}

export const sitesKeys = {
  all: ['sites'] as const,
  lists: () => [...sitesKeys.all, 'list'] as const,
}

export const complianceKeys = {
  all: ['compliance'] as const,
  summary: () => [...complianceKeys.all, 'summary'] as const,
}

export interface ComplianceViolation {
  employee_id: string
  week_start: string
  ordinary_hours: number
  overtime_hours: number
  reasons: string[]
}

export interface ComplianceSummary {
  compliance_score: number
  pass_count: number
  total_checks: number
  violations: ComplianceViolation[]
}

// ── 1. Sites Data ───────────────────────────────────────────────────────────
export function useSites() {
  const supabase = useDB()

  return useQuery({
    queryKey: sitesKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('*').order('name')
      if (error) throw error
      return data as SiteRow[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── 2. Attendance Records (Direct via RLS) ──────────────────────────────────
export function useAttendanceRecords() {
  const supabase = useDB()
  const { user } = useAuth()

  return useQuery({
    queryKey: attendanceKeys.lists(),
    queryFn: async () => {
      // RLS automatically filters this based on the JWT claims:
      //   Employee → restricted to their own rows.
      //   Manager/Admin → all rows for their tenant.
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: false })
        .order('clock_in', { ascending: false })

      if (error) throw error
      return data as AttendanceRow[]
    },
    enabled: !!user,
  })
}

// ── 3. Compliance Summary (computed client-side over RLS-scoped rows) ───────
// BCEA v1 weekly thresholds. A (employee, week) bucket is a "check"; it fails if
// either limit is exceeded. RLS scopes the underlying rows to the caller's
// tenant (and to their own rows for the employee role).
const MAX_ORDINARY_HOURS_PER_WEEK = 45
const MAX_OVERTIME_HOURS_PER_WEEK = 10
const LOOKBACK_WEEKS = 12

// Returns the Monday-based ISO date string for the week containing `date`,
// mirroring Postgres date_trunc('week', ...).
function weekStart(date: string): string {
  const d = new Date(date + 'T00:00:00Z')
  const day = d.getUTCDay() // 0 = Sun … 6 = Sat
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

export function useComplianceCheck() {
  const supabase = useDB()
  const { user } = useAuth()

  return useQuery({
    queryKey: complianceKeys.summary(),
    queryFn: async (): Promise<ComplianceSummary> => {
      const since = new Date()
      since.setDate(since.getDate() - LOOKBACK_WEEKS * 7)

      const { data, error } = await supabase
        .from('attendance_records')
        .select('employee_id, date, hours_worked, overtime')
        .gte('date', since.toISOString().slice(0, 10))

      if (error) throw error

      // Aggregate hours per (employee, week).
      const buckets = new Map<
        string,
        { employee_id: string; week_start: string; total: number; overtime: number }
      >()
      for (const row of data ?? []) {
        const ws = weekStart(row.date)
        const key = `${row.employee_id}|${ws}`
        const bucket = buckets.get(key) ?? {
          employee_id: row.employee_id,
          week_start: ws,
          total: 0,
          overtime: 0,
        }
        bucket.total += row.hours_worked ?? 0
        bucket.overtime += row.overtime ?? 0
        buckets.set(key, bucket)
      }

      const violations: ComplianceViolation[] = []
      for (const b of buckets.values()) {
        const ordinaryHours = Math.max(0, b.total - b.overtime)
        const reasons: string[] = []
        if (ordinaryHours > MAX_ORDINARY_HOURS_PER_WEEK) {
          reasons.push(
            `Ordinary hours ${ordinaryHours.toFixed(1)} exceed the ${MAX_ORDINARY_HOURS_PER_WEEK}h weekly limit`
          )
        }
        if (b.overtime > MAX_OVERTIME_HOURS_PER_WEEK) {
          reasons.push(
            `Overtime ${b.overtime.toFixed(1)}h exceeds the ${MAX_OVERTIME_HOURS_PER_WEEK}h weekly limit`
          )
        }
        if (reasons.length > 0) {
          violations.push({
            employee_id: b.employee_id,
            week_start: b.week_start,
            ordinary_hours: Number(ordinaryHours.toFixed(2)),
            overtime_hours: Number(b.overtime.toFixed(2)),
            reasons,
          })
        }
      }

      const totalChecks = buckets.size
      const passCount = totalChecks - violations.length
      const complianceScore = totalChecks === 0 ? 100 : Math.round((passCount / totalChecks) * 100)

      return {
        compliance_score: complianceScore,
        pass_count: passCount,
        total_checks: totalChecks,
        violations,
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

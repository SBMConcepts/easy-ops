import { useQuery } from '@tanstack/react-query'
import { useDB } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Database } from '../integrations/supabase/types'

// v2 operational tables. org_sites replaces the legacy `sites` table; the daily
// org_attendance aggregate (one row per user per day) replaces the legacy
// `attendance_records` event log. Typed directly from the generated schema —
// the useDB() client is fully typed, so no `any` casts are needed.
export type SiteRow = Database['public']['Tables']['org_sites']['Row']
export type AttendanceRow = Database['public']['Tables']['org_attendance']['Row']

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
      const { data, error } = await supabase.from('org_sites').select('*').order('site_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── 2. Attendance Records (Direct via RLS) ──────────────────────────────────
export function useAttendanceRecords() {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: attendanceKeys.lists(),
    queryFn: async () => {
      // org_attendance has RLS enabled with no policies, so the authenticated
      // client sees nothing. Read the org's daily aggregate via the service-role
      // Express endpoint instead.
      const res = await apiFetch<{ attendance: AttendanceRow[] }>('org_attendance')
      return res.attendance ?? []
    },
    enabled: !!user,
  })
}

// ── 3. Compliance Summary (via Express + RLS) ───────────────────────────────
export function useComplianceCheck() {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: complianceKeys.summary(),
    queryFn: () => apiFetch<ComplianceSummary>('compliance'),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

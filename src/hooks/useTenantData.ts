import { useQuery } from '@tanstack/react-query'
import { useDB } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useTenantApi } from './useTenantApi'
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

// ── 3. Compliance Summary (via Express + RLS) ───────────────────────────────
export function useComplianceCheck() {
  const { apiFetch } = useTenantApi()
  const { user } = useAuth()

  return useQuery({
    queryKey: complianceKeys.summary(),
    queryFn: () => apiFetch<ComplianceSummary>('compliance'),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

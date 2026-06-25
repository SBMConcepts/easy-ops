/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { useDB } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useTenantApi } from './useTenantApi'

// Legacy row shapes. The `sites` and `attendance_records` tables predate the v2
// schema and no longer exist in the database (replaced by org_sites /
// org_attendance with a different shape). These hooks and the pages that depend
// on them are retained for UI continuity but will not return data at runtime
// until refactored onto the new endpoints. Typed locally so the views compile.
export interface SiteRow {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number | null
}

export interface AttendanceRow {
  id: string
  employee_id: string
  tenant_id: string
  site_id: string | null
  method: string
  status: string
  date: string
  clock_in: string | null
  clock_out: string | null
  hours_worked: number | null
}

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
      const { data, error } = await (supabase as any).from('sites').select('*').order('name')
      if (error) throw error
      return (data ?? []) as SiteRow[]
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
      const { data, error } = await (supabase as any)
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: false })
        .order('clock_in', { ascending: false })

      if (error) throw error
      return (data ?? []) as AttendanceRow[]
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

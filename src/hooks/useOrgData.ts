import { useQuery } from '@tanstack/react-query'
import { useDB } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Database } from '../integrations/supabase/types'

// v2 operational tables. org_sites replaces the legacy `sites` table; the daily
// org_attendance aggregate (one row per user per day) replaces the legacy
// `attendance_records` event log. Typed directly from the generated schema —
// the useDB() client is fully typed, so no `any` casts are needed.

// org_attendance stores only raw references (auth0_user_id, department_id,
// site_id). The Express endpoint enriches each row with the resolved identity
// (first/last/full name via the users row for that auth0_user_id) and the
// department/site display names, so the client never renders an Auth0 sub or a
// UUID.
export type AttendanceRow = Database['public']['Tables']['org_attendance']['Row'] & {
  id: string
  auth0_org_id: string
  auth0_user_id: string
  date: string
  method: string
  hours_worked: number
  overtime: number
  first_name: string
  last_name: string
  full_name: string
  department_id: string
  department_name: string
  site_id: string
  site_name: string
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
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()
  const supabase = useDB()

  return useQuery({
    queryKey: sitesKeys.lists(),
    queryFn: async () => {
      // /api/org-sites returns a bare array of serialized sites.
      const sites = await apiFetch<SiteRow[]>('org-sites')
      return sites ?? []
    },
    enabled: !!user && !!supabase,
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
      const res = await apiFetch<{ attendance: AttendanceRow[] }>('org-attendance')
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

// ── 4. Sites , Departments & Job Titles (via Express) ───────────────────────────────
export interface SiteRow {
  id: string
  auth0_org_id: string
  department_id: string
  name: string
  site_name: string
  address: string
  latitude: number
  longitude: number
  geo_radius_m: number
}

export interface DepartmentRow {
  id: string
  auth0_org_id: string
  department_name: string
}

export interface JobRoleRow {
  id: string
  auth0_org_id: string
  name: string
  base_role: string
}

export const departmentsKeys = {
  all: ['org_departments'] as const,
}

export const rolesKeys = {
  all: ['org_roles'] as const,
}

export function useDepartments() {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery<DepartmentRow[]>({
    queryKey: departmentsKeys.all,
    queryFn: () => apiFetch('org-departments'),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  })
}

export function useRoles() {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery<JobRoleRow[]>({
    queryKey: rolesKeys.all,
    queryFn: async () => {
      const res = await apiFetch<{ roles: JobRoleRow[] }>('org-roles')
      return res.roles ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  })
}

// ── 5. Shifts (standard working hours / schedules, via Express) ─────────────
export interface ShiftRow {
  id: string
  auth0_org_id: string
  shift_name: string
  start_time: string
  end_time: string
  grace_period_minutes: number
  weekly_hours: number
}

export const shiftsKeys = {
  all: ['org_shifts'] as const,
}

export function useShifts() {
  const { apiFetch } = useOrgApi()
  const { user } = useAuth()

  return useQuery<ShiftRow[]>({
    queryKey: shiftsKeys.all,
    queryFn: async () => {
      const res = await apiFetch<{ shifts: ShiftRow[] }>('org-shifts')
      return res.shifts ?? []
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  })
}

// ── 6. Leave balances (via Express) ─────────────────────────────────────────
export interface LeaveBalanceRow {
  id: string
  auth0_org_id: string
  auth0_user_id: string
  leave_type: string
  balance_days: number
  updated_at: string
}

export const leaveKeys = {
  all: ['org_leave_balance'] as const,
  member: (auth0_user_id: string) => ['org_leave_balance', auth0_user_id] as const,
}

// Fetch a specific member's leave balances (admin view). Pass the target
// users.id; the caller must hold write:org_leave to read another member.
export function useLeaveBalances(auth0_user_id: string | null | undefined) {
  const { apiFetch } = useOrgApi()

  return useQuery<LeaveBalanceRow[]>({
    queryKey: leaveKeys.member(auth0_user_id ?? ''),
    queryFn: async () => {
      const res = await apiFetch<{ balances: LeaveBalanceRow[] }>(
        `org-leave_balance?auth0_user_id=${encodeURIComponent(auth0_user_id!)}`
      )
      return res.balances ?? []
    },
    enabled: !!auth0_user_id,
    staleTime: 1000 * 60 * 5,
  })
}

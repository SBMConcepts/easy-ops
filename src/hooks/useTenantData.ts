import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenantApi, type PaginatedResponse } from './useTenantApi'
import type {
  AttendanceRecordRow,
  AttendanceStatus,
  CheckInMethod,
} from '../integrations/supabase/types'

// =============================================================================
// useTenantData
//
// All tenant-scoped data hooks. Every query/mutation here goes through
// useTenantApi which attaches the Auth0 JWT — tenant resolution happens
// server-side via current_tenant_id(). No client-side tenant ID injection.
//
// Types are sourced from integrations/supabase/types.ts so that the shapes
// here stay in sync with the DB schema automatically when types are regenerated.
// Local re-definitions of AttendanceStatus, CheckInMethod etc. have been removed.
// =============================================================================

// ── Query key factories ──────────────────────────────────────────────────────
// Centralised so mutations can invalidate exactly the right cache entries.

export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (from: string, to: string) => [...attendanceKeys.lists(), { from, to }] as const,
  detail: (id: string) => [...attendanceKeys.all, 'detail', id] as const,
}

export const complianceKeys = {
  all: ['compliance'] as const,
  check: () => [...complianceKeys.all, 'check'] as const,
}

export const sitesKeys = {
  all: ['sites'] as const,
  list: () => [...sitesKeys.all, 'list'] as const,
}

export const membersKeys = {
  all: ['members'] as const,
  list: () => [...membersKeys.all, 'list'] as const,
}

// =============================================================================
// Attendance
// =============================================================================

// ── List ─────────────────────────────────────────────────────────────────────

export interface AttendanceListParams {
  dateFrom?: string // ISO date string YYYY-MM-DD, defaults to today
  dateTo?: string // ISO date string YYYY-MM-DD, defaults to today
  siteId?: string // filter to a specific site
  employeeId?: string // filter to a specific employee (admin/manager use)
}

/**
 * Fetches attendance records for the given date range.
 * Scoped to the caller's tenant automatically via JWT.
 */
export function useAttendanceRecords(params: AttendanceListParams = {}) {
  const { apiFetch } = useTenantApi()
  const today = new Date().toISOString().split('T')[0]

  const from = params.dateFrom ?? today
  const to = params.dateTo ?? today

  return useQuery({
    queryKey: attendanceKeys.list(from, to),
    queryFn: async () => {
      const qs = new URLSearchParams({
        date_from: from,
        date_to: to,
        ...(params.siteId ? { site_id: params.siteId } : {}),
        ...(params.employeeId ? { employee_id: params.employeeId } : {}),
      }).toString()

      return apiFetch<AttendanceRecordRow[]>(`attendance?${qs}`)
    },
    // Keep the previous data visible while fetching the next date range
    placeholderData: (prev) => prev,
  })
}

/**
 * Fetches a single attendance record by ID.
 */
export function useAttendanceRecord(recordId: string | undefined) {
  const { apiFetch } = useTenantApi()

  return useQuery({
    queryKey: attendanceKeys.detail(recordId ?? ''),
    queryFn: () => apiFetch<AttendanceRecordRow>(`attendance/${recordId}`),
    enabled: !!recordId,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export interface CheckInPayload {
  method: CheckInMethod
  site_id: string
  latitude?: number
  longitude?: number
}

export interface ClockOutPayload {
  /** Optional override — if omitted the server uses now() */
  clock_out?: string
}

export interface VerifyAttendancePayload {
  verified: true
  notes?: string
}

export interface ManualAttendancePayload {
  employee_id: string
  site_id: string
  date: string
  status: AttendanceStatus
  clock_in?: string
  clock_out?: string
  notes?: string
}

/**
 * Returns mutations for all attendance write operations.
 *
 * Each mutation automatically invalidates the attendance list cache on
 * success so the UI reflects the change without a manual refetch.
 */
export function useAttendanceMutations() {
  const { apiFetch } = useTenantApi()
  const queryClient = useQueryClient()

  const invalidateAttendance = () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all })

  // ── Clock in ───────────────────────────────────────────────────────────────
  const checkIn = useMutation({
    mutationFn: (payload: CheckInPayload) =>
      apiFetch<AttendanceRecordRow>('attendance', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidateAttendance,
  })

  // ── Clock out ──────────────────────────────────────────────────────────────
  const clockOut = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload?: ClockOutPayload }) =>
      apiFetch<AttendanceRecordRow>(`attendance/${recordId}/clock-out`, {
        method: 'PATCH',
        body: JSON.stringify(payload ?? {}),
      }),
    onSuccess: invalidateAttendance,
  })

  // ── Verify (supervisor / manager / admin) ──────────────────────────────────
  const verify = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: VerifyAttendancePayload }) =>
      apiFetch<AttendanceRecordRow>(`attendance/${recordId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidateAttendance,
  })

  // ── Manual entry (manager / admin) ────────────────────────────────────────
  const createManual = useMutation({
    mutationFn: (payload: ManualAttendancePayload) =>
      apiFetch<AttendanceRecordRow>('attendance/manual', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidateAttendance,
  })

  // ── Delete / void a record (admin only) ───────────────────────────────────
  const remove = useMutation({
    mutationFn: (recordId: string) =>
      apiFetch<null>(`attendance/${recordId}`, { method: 'DELETE' }),
    onSuccess: invalidateAttendance,
  })

  return { checkIn, clockOut, verify, createManual, remove }
}

// =============================================================================
// Compliance
// =============================================================================

export interface ComplianceViolation {
  employee_id: string
  name: string
  rule: string
  detail: string
}

export interface ComplianceCheckResult {
  compliance_score: number // 0–100
  total_checks: number
  pass_count: number
  fail_count: number // derived: total_checks - pass_count
  violations: ComplianceViolation[]
}

/**
 * Runs the tenant's compliance check and returns the current score and
 * any violations. Cached for 2 minutes — compliance state changes when
 * attendance records change, so the cache is short.
 */
export function useComplianceCheck() {
  const { apiFetch } = useTenantApi()

  return useQuery({
    queryKey: complianceKeys.check(),
    queryFn: () => apiFetch<ComplianceCheckResult>('compliance/check'),
    staleTime: 1000 * 60 * 2,
  })
}

// =============================================================================
// Sites  (read-only listing — mutations go in a dedicated useSiteMutations hook)
// =============================================================================

import type { SiteRow } from '../integrations/supabase/types'

/**
 * All sites for the current tenant.
 * Sites rarely change — 10 minute stale time.
 */
export function useSites() {
  const { apiFetch } = useTenantApi()

  return useQuery({
    queryKey: sitesKeys.list(),
    queryFn: () => apiFetch<SiteRow[]>('sites'),
    staleTime: 1000 * 60 * 10,
  })
}

// =============================================================================
// Members (read-only listing — mutations go in a dedicated useMemberMutations hook)
// =============================================================================

import type { MembershipWithUser } from '../integrations/supabase/types'

export interface MembersListParams {
  page?: number
  per_page?: number
  status?: string // membership_status filter
  role?: string // tenant_role filter
  site_id?: string
}

/**
 * Paginated list of active tenant members with user display fields resolved.
 * Uses the MembershipWithUser composite type from types.ts.
 */
export function useMembers(params: MembersListParams = {}) {
  const { apiFetchList } = useTenantApi()

  return useQuery({
    queryKey: [...membersKeys.list(), params],
    queryFn: () =>
      apiFetchList<MembershipWithUser>('members', {
        page: params.page ?? 1,
        per_page: params.per_page ?? 25,
        ...(params.status ? { status: params.status } : {}),
        ...(params.role ? { role: params.role } : {}),
        ...(params.site_id ? { site_id: params.site_id } : {}),
      }),
    placeholderData: (prev) => prev,
  })
}

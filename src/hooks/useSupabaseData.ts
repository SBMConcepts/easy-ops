import { useQuery } from '@tanstack/react-query'
import type {
  AppRole,
  AttendanceStatus,
  CheckInMethod,
  Database,
} from '../integrations/supabase/types'
import { useTenantApi } from './useTenantApi'

type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Site = Database['public']['Tables']['sites']['Row']
type UserRole = Database['public']['Tables']['user_roles']['Row']

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useAttendanceRecords(dateFrom?: string, dateTo?: string) {
  const { apiFetch, isAuthenticated } = useTenantApi()
  return useQuery({
    queryKey: ['attendance-records', dateFrom, dateTo],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const qs = new URLSearchParams({
        date_from: dateFrom || today,
        date_to: dateTo || today,
      }).toString()
      return apiFetch<{
        records: Array<{
          id: string
          date: string
          clock_in: string | null
          clock_out: string | null
          method: CheckInMethod
          status: AttendanceStatus
          hours_worked: string | null
          overtime: string | null
          notes: string | null
          employee_id: string
          site_id: string
          profiles: { full_name: string; department: string | null; site: string | null } | null
          sites: { name: string | null } | null
        }>
        stats: {
          present: number
          late: number
          absent: number
          on_leave: number
          total_hours: number
          total_overtime: number
          total: number
        }
      }>(`attendance-report?${qs}`)
    },
    enabled: isAuthenticated,
  })
}

export function useMyAttendance() {
  const { getDb, isAuthenticated } = useTenantApi()
  return useQuery({
    queryKey: ['my-attendance'],
    queryFn: async () => {
      const db = await getDb()
      const { data, error } = await db
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as AttendanceRecord[]
    },
    enabled: isAuthenticated,
  })
}

export function useTodayStatus() {
  const { getDb, isAuthenticated } = useTenantApi()
  return useQuery({
    queryKey: ['today-status'],
    queryFn: async () => {
      const db = await getDb()
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await db
        .from('attendance_records')
        .select('*')
        .eq('date', today)
        .is('clock_out', null)
        .maybeSingle()
      if (error) throw error
      return data as AttendanceRecord | null
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })
}

export function useEmployees() {
  const { getDb, isAuthenticated } = useTenantApi()
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const db = await getDb()
      const { data: profilesData, error } = await db.from('profiles').select('*').order('full_name')
      if (error) throw error
      const profiles = (profilesData ?? []) as Profile[]

      const userIds = profiles.map((p) => p.id)
      const rolesData = userIds.length
        ? (await db.from('user_roles').select('user_id, organisation_roles').in('user_id', userIds))
            .data
        : ([] as Pick<UserRole, 'user_id' | 'organisation_roles'>[])

      const roles = (rolesData ?? []) as Pick<UserRole, 'user_id' | 'organisation_roles'>[]
      const roleMap = Object.fromEntries(
        roles.map((r) => [r.user_id, r.organisation_roles || ('employee' as AppRole)])
      )
      return profiles.map((p) => ({
        ...p,
        user_roles: roleMap[p.id] ? [{ role: roleMap[p.id] as AppRole }] : [],
      })) as (Profile & { user_roles: { role: AppRole }[] })[]
    },
    enabled: isAuthenticated,
  })
}

export function useSites() {
  const { getDb, isAuthenticated } = useTenantApi()
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const db = await getDb()
      const { data, error } = await db.from('sites').select('*').order('name')
      if (error) throw error
      return data as Site[]
    },
    enabled: isAuthenticated,
  })
}

export function useComplianceCheck() {
  const { apiFetch, isAuthenticated } = useTenantApi()
  return useQuery({
    queryKey: ['compliance-check'],
    queryFn: () =>
      apiFetch<{
        compliance_score: number
        total_checks: number
        pass_count: number
        violations: Array<{
          employee_id: string
          name: string
          rule: string
          detail: string
        }>
      }>('compliance-check'),
    enabled: isAuthenticated,
  })
}

// ── Standalone mutation helpers ───────────────────────────────────────────────

type GetToken = () => Promise<string>

const FUNCTIONS_BASE_URL = `${import.meta.env.SUPABASE_URL}/functions/v1`

async function tenantPost<T = unknown>(
  getToken: GetToken,
  path: string,
  body: unknown
): Promise<T> {
  const token = await getToken()
  const response = await fetch(`${FUNCTIONS_BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    throw new Error(`[${response.status}] /${path}: ${detail}`)
  }
  return response.json() as Promise<T>
}

export async function checkIn(
  getToken: GetToken,
  method: CheckInMethod,
  siteId?: string,
  latitude?: number,
  longitude?: number
) {
  return tenantPost(getToken, 'check-in', { method, site_id: siteId, latitude, longitude })
}

export async function checkOut(getToken: GetToken) {
  return tenantPost(getToken, 'check-out', {})
}

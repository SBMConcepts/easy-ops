import { useQuery } from '@tanstack/react-query'
import { useTenantApi } from './useTenantApi'

// ── Shared Domain Types ───────────────────────────────────────────────────────
export type CheckInMethod = 'qr' | 'biometric' | 'whatsapp' | 'manual'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave'

export interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  method: CheckInMethod
  status: AttendanceStatus
  hours_worked: string | null
  notes: string | null
  employee_profile_id: string
  site_id: string
  verified: boolean
}

// ── Query Hooks ───────────────────────────────────────────────────────────────

export function useAttendanceRecords(dateFrom?: string, dateTo?: string) {
  const { apiFetch } = useTenantApi()

  return useQuery({
    queryKey: ['attendance-records', dateFrom, dateTo],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const qs = new URLSearchParams({
        date_from: dateFrom || today,
        date_to: dateTo || today,
      }).toString()

      return apiFetch<AttendanceRecord[]>(`attendance?${qs}`)
    },
  })
}

export function useComplianceCheck() {
  const { apiFetch } = useTenantApi()

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
      }>('compliance/check'),
  })
}

// ── Mutation Hooks ────────────────────────────────────────────────────────────

export function useAttendanceMutations() {
  const { apiFetch } = useTenantApi()

  const checkIn = async (method: CheckInMethod, siteId: string, lat?: number, lng?: number) => {
    return apiFetch<AttendanceRecord>('attendance', {
      method: 'POST',
      body: JSON.stringify({
        method,
        siteId,
        latitude: lat,
        longitude: lng,
      }),
    })
  }

  const clockOut = async (recordId: string) => {
    return apiFetch<AttendanceRecord>(`attendance/${recordId}/clock-out`, {
      method: 'PATCH',
    })
  }

  return { checkIn, clockOut }
}

import { useQuery } from '@tanstack/react-query'
import { useDB } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../integrations/supabase/types'

type SiteRow = Database['public']['Tables']['sites']['Row']
type AttendanceRow = Database['public']['Tables']['attendance_records']['Row']
type EmployeeProfileRow = Database['public']['Tables']['employee_profiles']['Row']

export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
}

export const sitesKeys = {
  all: ['sites'] as const,
  lists: () => [...sitesKeys.all, 'list'] as const,
}

export const membersKeys = {
  all: ['members'] as const,
  lists: () => [...membersKeys.all, 'list'] as const,
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
    enabled: !!supabase,
  })
}

// ── 2. Members / Profiles ───────────────────────────────────────────────────
export function useMembers() {
  const supabase = useDB()

  return useQuery({
    queryKey: membersKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select(
          `
          *,
          memberships(role, status),
          departments(name),
          sites(name)
        `
        )
        .order('full_name')

      if (error) throw error
      return data
    },
    enabled: !!supabase,
  })
}

// ── 3. Attendance Records (Direct via RLS) ──────────────────────────────────
export function useAttendanceRecords() {
  const supabase = useDB()
  const { user } = useAuth()

  return useQuery({
    queryKey: attendanceKeys.lists(),
    queryFn: async () => {
      // RLS automatically filters this based on JWT!
      // If user is Employee: RLS policy restricts them to their own rows.
      // If user is Manager: RLS policy grants them all rows for their Tenant.
      let query = supabase
        .from('attendance_records')
        .select(
          `
          *,
          profiles:employee_profiles(full_name, department_id),
          sites(name)
        `
        )
        .order('date', { ascending: false })
        .order('clock_in', { ascending: false })

      // For extra safety, if it's just an employee, we can explicitly filter the client side query too
      if (user?.role === 'employee') {
        // Fetch their specific profile ID first (or rely purely on RLS)
        query = query.eq('id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!supabase && !!user,
  })
}

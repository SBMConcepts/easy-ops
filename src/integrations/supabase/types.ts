/**
 * Application-level types that mirror the Supabase schema.
 *
 * These are kept intentionally minimal — only the shapes actually consumed
 * by the frontend.  Full generated types can be added later with the Supabase
 * CLI (`supabase gen types typescript`).
 */

// ── Role enum ────────────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'employee'

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave'
export type CheckInMethod = 'qr' | 'biometric' | 'whatsapp' | 'manual'

// ── Row shapes ───────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          role: AppRole | null
          department_id: string | null
          profile_site_id: string | null
          avatar_url: string | null
          organisation_id: string | null
          cell_number: string | null
          address: string | null
          id_number: string | null
          date_of_birth: string | null
          start_date: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          bio: string | null
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      organisations: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          onboarding_completed: boolean | null
          settings: Record<string, unknown> | null
        }
        Insert: Partial<Database['public']['Tables']['organisations']['Row']>
        Update: Partial<Database['public']['Tables']['organisations']['Row']>
      }
      attendance_records: {
        Row: {
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
        }
        Insert: Partial<Database['public']['Tables']['attendance_records']['Row']>
        Update: Partial<Database['public']['Tables']['attendance_records']['Row']>
      }
      sites: {
        Row: {
          id: string
          name: string
          address: string | null
          latitude: number | null
          longitude: number | null
          geofence_radius_m: number | null
          organisation_id: string | null
        }
        Insert: Partial<Database['public']['Tables']['sites']['Row']>
        Update: Partial<Database['public']['Tables']['sites']['Row']>
      }
      user_roles: {
        Row: {
          user_id: string
          organisation_roles: AppRole | null
        }
        Insert: Partial<Database['public']['Tables']['user_roles']['Row']>
        Update: Partial<Database['public']['Tables']['user_roles']['Row']>
      }
      easy_ops_sales_leads: {
        Row: {
          id: string
          full_name: string
          lead_email: string
          lead_phone: string | null
          company_name: string
          employee_count: string
          selected_plan: string
          country: string | null
          message: string | null
          created_at: string | null
        }
        Insert: Omit<
          Database['public']['Tables']['easy_ops_sales_leads']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['easy_ops_sales_leads']['Row']>
      }
    }
  }
}

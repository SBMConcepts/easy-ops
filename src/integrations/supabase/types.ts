/* eslint-disable */
/**
 * Supabase PostgREST types shape:
 * - `Json` = any (per your request)
 * - Includes public tables, functions, enums, views, and relationships.
 */

export type Json = any

export type UUID = string

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'employee'
export type CheckInMethod = 'qr' | 'biometric' | 'whatsapp' | 'manual'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: UUID
          avatar_url: string | null
          created_at: string
          updated_at: string

          organisation_id: UUID | null
          department_id: UUID | null
          profile_site_id: UUID | null

          address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          bio: string | null

          id_number: string | null
          date_of_birth: string | null

          start_date: string | null
          full_name: string | null
          email: string | null

          is_active: boolean | null
          cell_number: string | null

          role: AppRole | null
        }
        Insert: {
          id?: UUID
          avatar_url?: string | null
          created_at?: string
          updated_at?: string

          organisation_id?: UUID | null
          department_id?: UUID | null
          profile_site_id?: UUID | null

          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          bio?: string | null

          id_number?: string | null
          date_of_birth?: string | null

          start_date?: string | null
          full_name?: string | null
          email?: string | null

          is_active?: boolean | null
          cell_number?: string | null

          role?: AppRole | null
        }
        Update: {
          id?: UUID
          avatar_url?: string | null
          created_at?: string
          updated_at?: string

          organisation_id?: UUID | null
          department_id?: UUID | null
          profile_site_id?: UUID | null

          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          bio?: string | null

          id_number?: string | null
          date_of_birth?: string | null

          start_date?: string | null
          full_name?: string | null
          email?: string | null

          is_active?: boolean | null
          cell_number?: string | null

          role?: AppRole | null
        }
      }

      user_roles: {
        Row: {
          id: UUID
          user_id: UUID
          organisation_roles: AppRole
        }
        Insert: {
          id?: UUID
          user_id: UUID
          organisation_roles: AppRole
        }
        Update: {
          id?: UUID
          user_id?: UUID
          organisation_roles?: AppRole
        }
      }

      sites: {
        Row: {
          id: UUID
          name: string
          address: string | null

          latitude: number | null
          longitude: number | null
          geofence_radius_m: number | null

          created_at: string
          organisation_id: UUID | null
        }
        Insert: {
          id?: UUID
          name: string
          address?: string | null

          latitude?: number | null
          longitude?: number | null
          geofence_radius_m?: number | null

          created_at?: string
          organisation_id?: UUID | null
        }
        Update: {
          id?: UUID
          name?: string
          address?: string | null

          latitude?: number | null
          longitude?: number | null
          geofence_radius_m?: number | null

          created_at?: string
          organisation_id?: UUID | null
        }
      }

      departments: {
        Row: {
          id: UUID
          name: string
          site_id: UUID | null
          created_at: string
          organisation_id: UUID | null
        }
        Insert: {
          id?: UUID
          name: string
          site_id?: UUID | null
          created_at?: string
          organisation_id?: UUID | null
        }
        Update: {
          id?: UUID
          name?: string
          site_id?: UUID | null
          created_at?: string
          organisation_id?: UUID | null
        }
      }

      shifts: {
        Row: {
          id: UUID
          name: string
          start_time: string // time (no tz)
          end_time: string // time (no tz)
          grace_period_minutes: number | null

          site_id: UUID | null

          created_at: string
          organisation_id: UUID | null

          shift_date: string | null // date
          employee_id: UUID | null
        }
        Insert: {
          id?: UUID
          name: string
          start_time: string
          end_time: string
          grace_period_minutes?: number | null
          site_id?: UUID | null

          created_at?: string
          organisation_id?: UUID | null

          shift_date?: string | null
          employee_id?: UUID | null
        }
        Update: {
          id?: UUID
          name?: string
          start_time?: string
          end_time?: string
          grace_period_minutes?: number | null
          site_id?: UUID | null

          created_at?: string
          organisation_id?: UUID | null

          shift_date?: string | null
          employee_id?: UUID | null
        }
      }

      attendance_records: {
        Row: {
          id: UUID
          employee_id: UUID
          date: string

          clock_in: string | null
          clock_out: string | null

          method: CheckInMethod
          status: AttendanceStatus

          site_id: UUID
          latitude: number | null
          longitude: number | null

          verified: boolean | null
          verified_by: UUID | null

          hours_worked: string | null // numeric -> string
          overtime: string | null // numeric -> string

          notes: string | null

          created_at: string
          updated_at: string

          organisation_id: UUID | null
        }
        Insert: {
          id?: UUID
          employee_id: UUID
          date?: string

          clock_in?: string | null
          clock_out?: string | null

          method?: CheckInMethod
          status?: AttendanceStatus

          site_id: UUID
          latitude?: number | null
          longitude?: number | null

          verified?: boolean | null
          verified_by?: UUID | null

          hours_worked?: string | null
          overtime?: string | null

          notes?: string | null

          created_at?: string
          updated_at?: string

          organisation_id?: UUID | null
        }
        Update: {
          id?: UUID
          employee_id?: UUID
          date?: string

          clock_in?: string | null
          clock_out?: string | null

          method?: CheckInMethod
          status?: AttendanceStatus

          site_id?: UUID
          latitude?: number | null
          longitude?: number | null

          verified?: boolean | null
          verified_by?: UUID | null

          hours_worked?: string | null
          overtime?: string | null

          notes?: string | null

          created_at?: string
          updated_at?: string

          organisation_id?: UUID | null
        }
      }

      audit_log: {
        Row: {
          id: UUID
          user_id: UUID | null
          action: string
          target_table: string | null
          target_id: UUID | null
          details: Json | null
          created_at: string
          organisation_id: UUID | null
        }
        Insert: {
          id?: UUID
          user_id?: UUID | null
          action: string
          target_table?: string | null
          target_id?: UUID | null
          details?: Json | null
          created_at?: string
          organisation_id?: UUID | null
        }
        Update: {
          id?: UUID
          user_id?: UUID | null
          action?: string
          target_table?: string | null
          target_id?: UUID | null
          details?: Json | null
          created_at?: string
          organisation_id?: UUID | null
        }
      }

      organisations: {
        Row: {
          id: UUID
          name: string
          industry: string | null

          country: string | null
          logo_url: string | null

          onboarding_completed: boolean | null
          settings: Json | null

          created_by: UUID

          created_at: string
          updated_at: string

          subscription_status: string | null
          max_employees: bigint | number | null
        }
        Insert: {
          id?: UUID
          name: string
          industry?: string | null

          country?: string | null
          logo_url?: string | null

          onboarding_completed?: boolean | null
          settings?: Json | null

          created_by: UUID

          created_at?: string
          updated_at?: string

          subscription_status?: string | null
          max_employees?: bigint | number | null
        }
        Update: {
          id?: UUID
          name?: string
          industry?: string | null

          country?: string | null
          logo_url?: string | null

          onboarding_completed?: boolean | null
          settings?: Json | null

          created_by?: UUID

          created_at?: string
          updated_at?: string

          subscription_status?: string | null
          max_employees?: bigint | number | null
        }
      }

      organisation_roles: {
        Row: {
          id: UUID
          organisation_id: UUID
          name: string
          base_role: AppRole
          created_at: string
        }
        Insert: {
          id?: UUID
          organisation_id: UUID
          name: string
          base_role: AppRole
          created_at?: string
        }
        Update: {
          id?: UUID
          organisation_id?: UUID
          name?: string
          base_role?: AppRole
          created_at?: string
        }
      }

      shift_sites: {
        Row: {
          shift_id: UUID
          site_id: UUID
        }
        Insert: {
          shift_id: UUID
          site_id: UUID
        }
        Update: {
          shift_id?: UUID
          site_id?: UUID
        }
      }

      employee_shifts: {
        Row: {
          id: UUID
          employee_id: UUID
          shift_id: UUID
          organisation_id: UUID

          effective_from: string // date
          effective_to: string | null

          created_at: string
        }
        Insert: {
          id?: UUID
          employee_id: UUID
          shift_id: UUID
          organisation_id: UUID

          effective_from: string
          effective_to?: string | null

          created_at?: string
        }
        Update: {
          id?: UUID
          employee_id?: UUID
          shift_id?: UUID
          organisation_id?: UUID

          effective_from?: string
          effective_to?: string | null

          created_at?: string
        }
      }

      organisation_check_in_methods: {
        Row: {
          organisation_id: UUID
          method: CheckInMethod
        }
        Insert: {
          organisation_id: UUID
          method: CheckInMethod
        }
        Update: {
          organisation_id?: UUID
          method?: CheckInMethod
        }
      }

      leave_requests: {
        Row: {
          id: UUID
          employee_id: UUID
          organisation_id: UUID

          leave_type: string
          start_date: string
          end_date: string

          status: string

          approved_by: UUID | null
          notes: string | null

          created_at: string
          updated_at: string
        }
        Insert: {
          id?: UUID
          employee_id: UUID
          organisation_id: UUID

          leave_type: string
          start_date: string
          end_date: string

          status?: string

          approved_by?: UUID | null
          notes?: string | null

          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: UUID
          employee_id?: UUID
          organisation_id?: UUID

          leave_type?: string
          start_date?: string
          end_date?: string

          status?: string

          approved_by?: UUID | null
          notes?: string | null

          created_at?: string
          updated_at?: string
        }
      }

      easy_ops_sales_leads: {
        Row: {
          sale_lead_id: UUID

          full_name: string
          lead_email: string
          lead_phone: string

          company_name: string
          employee_count: string
          selected_plan: string

          country: string
          message: string
          status: string

          created_at: string // date
          updated_at: string | null // date
        }
        Insert: {
          sale_lead_id?: UUID
          full_name: string
          lead_email: string
          lead_phone: string

          company_name: string
          employee_count: string
          selected_plan: string

          country: string
          message?: string
          status?: string

          created_at?: string
          updated_at?: string | null
        }
        Update: {
          sale_lead_id?: UUID

          full_name?: string
          lead_email?: string
          lead_phone?: string

          company_name?: string
          employee_count?: string
          selected_plan?: string

          country?: string
          message?: string
          status?: string

          created_at?: string
          updated_at?: string | null
        }
      }
    }

    Views: {}

    Enums: {
      app_role: {
        admin: 'admin'
        manager: 'manager'
        supervisor: 'supervisor'
        employee: 'employee'
      }
      check_in_method: {
        qr: 'qr'
        biometric: 'biometric'
        whatsapp: 'whatsapp'
        manual: 'manual'
      }
      attendance_status: {
        present: 'present'
        late: 'late'
        absent: 'absent'
        on_leave: 'on_leave'
      }
    }

    Relationships: [
      {
        foreignKeyName: 'profiles_department_id_fkey'
        columns: ['department_id']
        isOneToOne: false
        referencedRelation: 'departments'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'user_roles_user_id_profiles_fkey'
        columns: ['user_id']
        isOneToOne: false
        referencedRelation: 'profiles'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'profiles_id_fkey'
        columns: ['id']
        isOneToOne: true
        referencedRelation: 'auth.users'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'profiles_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'shifts_employee_id_fkey'
        columns: ['employee_id']
        isOneToOne: false
        referencedRelation: 'profiles'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'leave_requests_approved_by_fkey'
        columns: ['approved_by']
        isOneToOne: false
        referencedRelation: 'profiles'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'leave_requests_employee_id_fkey'
        columns: ['employee_id']
        isOneToOne: false
        referencedRelation: 'profiles'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'employee_shifts_employee_id_fkey'
        columns: ['employee_id']
        isOneToOne: false
        referencedRelation: 'profiles'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'profiles_profile_site_id_fkey'
        columns: ['profile_site_id']
        isOneToOne: false
        referencedRelation: 'sites'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'user_roles_user_id_fkey'
        columns: ['user_id']
        isOneToOne: false
        referencedRelation: 'auth.users'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'departments_site_id_fkey'
        columns: ['site_id']
        isOneToOne: false
        referencedRelation: 'sites'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'departments_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'sites_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'shifts_site_id_fkey'
        columns: ['site_id']
        isOneToOne: false
        referencedRelation: 'sites'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'shifts_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'shift_sites_site_id_fkey'
        columns: ['site_id']
        isOneToOne: false
        referencedRelation: 'sites'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'shift_sites_shift_id_fkey'
        columns: ['shift_id']
        isOneToOne: false
        referencedRelation: 'shifts'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'employee_shifts_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'employee_shifts_shift_id_fkey'
        columns: ['shift_id']
        isOneToOne: false
        referencedRelation: 'shifts'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'organisation_roles_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'organisation_check_in_methods_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'attendance_records_site_id_fkey'
        columns: ['site_id']
        isOneToOne: false
        referencedRelation: 'sites'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'attendance_records_employee_id_fkey'
        columns: ['employee_id']
        isOneToOne: false
        referencedRelation: 'auth.users'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'attendance_records_verified_by_fkey'
        columns: ['verified_by']
        isOneToOne: false
        referencedRelation: 'auth.users'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'attendance_records_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'audit_log_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'audit_log_user_id_fkey'
        columns: ['user_id']
        isOneToOne: false
        referencedRelation: 'auth.users'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'fk_organisations_created_by'
        columns: ['created_by']
        isOneToOne: false
        referencedRelation: 'auth.users'
        referencedColumns: ['id']
      },

      {
        foreignKeyName: 'leave_requests_organisation_id_fkey'
        columns: ['organisation_id']
        isOneToOne: false
        referencedRelation: 'organisations'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'leave_requests_approved_by_fkey'
        columns: ['approved_by']
        isOneToOne: false
        referencedRelation: 'profiles'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'leave_requests_employee_id_fkey'
        columns: ['employee_id']
        isOneToOne: false
        referencedRelation: 'profiles'
        referencedColumns: ['id']
      },
    ]

    Functions: {
      clock_in: {
        Args: {
          p_site_id: UUID
          p_lat: number
          p_lng: number
        }
        Returns: Json
      }

      onboard_organisation_admin_tx: {
        Args: {
          p_email: string
          p_role: string
          p_organisation_name: string
          p_sites: Json
          p_departments: Json
          p_admin_link: Json
          p_industry?: string | null
          p_country?: string | null
          p_logo_url?: string | null
          p_settings?: Json
        }
        Returns: Json
      }

      get_my_org_id: {
        Args: {}
        Returns: UUID
      }

      get_user_department: {
        Args: {
          _user_id: UUID
        }
        Returns: string
      }

      get_user_role: {
        Args: {
          _user_id: UUID
        }
        Returns: AppRole
      }

      get_user_site: {
        Args: {
          _user_id: UUID
        }
        Returns: string
      }

      has_role: {
        Args: {
          _user_id: UUID
          _role: AppRole
        }
        Returns: boolean
      }
    }
  }
}

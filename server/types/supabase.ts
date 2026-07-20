export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          diff: Json
          id: string
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          auth0_org_id?: string
          auth0_user_id: string
          created_at?: string
          diff?: Json
          id?: string
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          diff?: Json
          id?: string
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'audit_logs_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          auth0_org_id: string
          email: string
          expires_at: string
          id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          auth0_org_id: string
          email: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          auth0_org_id?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      labour_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: Database['public']['Enums']['forecast_alert_type']
          auth0_org_id: string
          auth0_user_id: string | null
          created_at: string
          detail: string | null
          forecast_id: string | null
          id: string
          metrics: Json | null
          recommended_action: string | null
          resolved_at: string | null
          severity: Database['public']['Enums']['forecast_alert_severity']
          site_id: string | null
          status: Database['public']['Enums']['forecast_alert_status']
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: Database['public']['Enums']['forecast_alert_type']
          auth0_org_id: string
          auth0_user_id?: string | null
          created_at?: string
          detail?: string | null
          forecast_id?: string | null
          id?: string
          metrics?: Json | null
          recommended_action?: string | null
          resolved_at?: string | null
          severity?: Database['public']['Enums']['forecast_alert_severity']
          site_id?: string | null
          status?: Database['public']['Enums']['forecast_alert_status']
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: Database['public']['Enums']['forecast_alert_type']
          auth0_org_id?: string
          auth0_user_id?: string | null
          created_at?: string
          detail?: string | null
          forecast_id?: string | null
          id?: string
          metrics?: Json | null
          recommended_action?: string | null
          resolved_at?: string | null
          severity?: Database['public']['Enums']['forecast_alert_severity']
          site_id?: string | null
          status?: Database['public']['Enums']['forecast_alert_status']
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'labour_alerts_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'labour_alerts_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: false
            referencedRelation: 'user_credentials'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'labour_alerts_forecast_id_fkey'
            columns: ['forecast_id']
            isOneToOne: false
            referencedRelation: 'labour_forecasts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'labour_alerts_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['id']
          },
        ]
      }
      labour_forecasts: {
        Row: {
          auth0_org_id: string
          confidence: number | null
          created_at: string
          demand_score: number | null
          forecast_date: string
          generated_by: string | null
          horizon_days: number
          id: string
          input_summary: Json | null
          model: string | null
          predicted_hours: number | null
          predicted_required_staff: number | null
          reasoning: string | null
          site_id: string | null
        }
        Insert: {
          auth0_org_id: string
          confidence?: number | null
          created_at?: string
          demand_score?: number | null
          forecast_date: string
          generated_by?: string | null
          horizon_days?: number
          id?: string
          input_summary?: Json | null
          model?: string | null
          predicted_hours?: number | null
          predicted_required_staff?: number | null
          reasoning?: string | null
          site_id?: string | null
        }
        Update: {
          auth0_org_id?: string
          confidence?: number | null
          created_at?: string
          demand_score?: number | null
          forecast_date?: string
          generated_by?: string | null
          horizon_days?: number
          id?: string
          input_summary?: Json | null
          model?: string | null
          predicted_hours?: number | null
          predicted_required_staff?: number | null
          reasoning?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'labour_forecasts_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'labour_forecasts_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['id']
          },
        ]
      }
      org_attendance: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          date: string
          department_id: string | null
          hours_worked: number
          id: string
          method: Database['public']['Enums']['check_in_method']
          overtime: number
          site_id: string | null
        }
        Insert: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          date: string
          department_id?: string | null
          hours_worked: number
          id?: string
          method: Database['public']['Enums']['check_in_method']
          overtime: number
          site_id?: string | null
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          date?: string
          department_id?: string | null
          hours_worked?: number
          id?: string
          method?: Database['public']['Enums']['check_in_method']
          overtime?: number
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'org_attendance_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'org_attendance_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'org_attendance_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'org_departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_attendance_member_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'org_attendance_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['id']
          },
        ]
      }
      org_departments: {
        Row: {
          auth0_org_id: string
          created_at: string
          department_name: string
          id: string
          updated_at: string
        }
        Insert: {
          auth0_org_id?: string
          created_at?: string
          department_name?: string
          id?: string
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          created_at?: string
          department_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_departments_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      org_leave_balances: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          balance_days: number
          id: string
          leave_type: string
          updated_at: string
        }
        Insert: {
          auth0_org_id: string
          auth0_user_id: string
          balance_days?: number
          id?: string
          leave_type: string
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          balance_days?: number
          id?: string
          leave_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_leave_balances_member_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'org_leave_balances_org_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      org_members: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          department_id: string | null
          employee_code: string | null
          employment_type: string | null
          hourly_rate: number | null
          id: string
          job_role_id: string | null
          joined_at: string
          manager_id: string | null
          role: string
          shift_id: string | null
          site_id: string | null
          status: string
          tax_number: string | null
        }
        Insert: {
          auth0_org_id?: string
          auth0_user_id?: string
          department_id?: string | null
          employee_code?: string | null
          employment_type?: string | null
          hourly_rate?: number | null
          id?: string
          job_role_id?: string | null
          joined_at?: string
          manager_id?: string | null
          role?: string
          shift_id?: string | null
          site_id?: string | null
          status?: string
          tax_number?: string | null
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          department_id?: string | null
          employee_code?: string | null
          employment_type?: string | null
          hourly_rate?: number | null
          id?: string
          job_role_id?: string | null
          joined_at?: string
          manager_id?: string | null
          role?: string
          shift_id?: string | null
          site_id?: string | null
          status?: string
          tax_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'org_members_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'org_members_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: true
            referencedRelation: 'user_credentials'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'org_members_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'org_departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_members_job_role_id_fkey'
            columns: ['job_role_id']
            isOneToOne: false
            referencedRelation: 'org_roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_members_manager_id_fkey'
            columns: ['manager_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_members_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'org_shifts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_members_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['id']
          },
        ]
      }
      org_roles: {
        Row: {
          auth0_org_id: string
          base_role: string | null
          id: string
          name: string
        }
        Insert: {
          auth0_org_id?: string
          base_role?: string | null
          id?: string
          name: string
        }
        Update: {
          auth0_org_id?: string
          base_role?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_roles_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      org_shifts: {
        Row: {
          auth0_org_id: string
          created_at: string
          end_time: string | null
          grace_period_minutes: number
          id: string
          name: string
          start_time: string | null
          updated_at: string
          weekly_hours: number | null
        }
        Insert: {
          auth0_org_id: string
          created_at?: string
          end_time?: string | null
          grace_period_minutes?: number
          id?: string
          name?: string
          start_time?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Update: {
          auth0_org_id?: string
          created_at?: string
          end_time?: string | null
          grace_period_minutes?: number
          id?: string
          name?: string
          start_time?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'org_shifts_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      org_sites: {
        Row: {
          address: string
          auth0_org_id: string
          department_id: string
          geo_radius: number
          id: string
          latitude: number
          longitude: number
          site_name: string
        }
        Insert: {
          address?: string
          auth0_org_id?: string
          department_id: string
          geo_radius: number
          id?: string
          latitude: number
          longitude: number
          site_name?: string
        }
        Update: {
          address?: string
          auth0_org_id?: string
          department_id?: string
          geo_radius?: number
          id?: string
          latitude?: number
          longitude?: number
          site_name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_sites_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'org_sites_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'org_departments'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          auth0_org_id: string
          country: string
          created_at: string
          industry: string
          logo_url: string
          metadata: Json
          name: string
          plan: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          auth0_org_id?: string
          country?: string
          created_at?: string
          industry?: string
          logo_url?: string
          metadata?: Json
          name: string
          plan?: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          country?: string
          created_at?: string
          industry?: string
          logo_url?: string
          metadata?: Json
          name?: string
          plan?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_export_runs: {
        Row: {
          auth0_org_id: string
          created_at: string
          employee_count: number
          format: string
          generated_by: string | null
          gross_total: number
          id: string
          net_total: number
          paye_total: number
          period_end: string
          period_start: string
          uif_total: number
        }
        Insert: {
          auth0_org_id: string
          created_at?: string
          employee_count?: number
          format: string
          generated_by?: string | null
          gross_total?: number
          id?: string
          net_total?: number
          paye_total?: number
          period_end: string
          period_start: string
          uif_total?: number
        }
        Update: {
          auth0_org_id?: string
          created_at?: string
          employee_count?: number
          format?: string
          generated_by?: string | null
          gross_total?: number
          id?: string
          net_total?: number
          paye_total?: number
          period_end?: string
          period_start?: string
          uif_total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'payroll_export_runs_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      subscriptions: {
        Row: {
          auth0_org_id: string
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          trial_ends_at: string | null
        }
        Insert: {
          auth0_org_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: string
          status?: string
          trial_ends_at?: string | null
        }
        Update: {
          auth0_org_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      user_credentials: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          email: string
          email_verified: boolean
          id: string
          password_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          email: string
          email_verified?: boolean
          id?: string
          password_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          email?: string
          email_verified?: boolean
          id?: string
          password_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_credentials_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'user_credentials_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          auth0_org_id: string
          auth0_user_id: string
          avatar_url: string | null
          created_at: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          full_name: string
          id: string
          id_type: string | null
          last_name: string
          last_seen_at: string
          mobile_number: string | null
          national_id: string | null
        }
        Insert: {
          address?: string | null
          auth0_org_id?: string
          auth0_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          full_name?: string
          id?: string
          id_type?: string | null
          last_name?: string
          last_seen_at?: string
          mobile_number?: string | null
          national_id?: string | null
        }
        Update: {
          address?: string | null
          auth0_org_id?: string
          auth0_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          full_name?: string
          id?: string
          id_type?: string | null
          last_name?: string
          last_seen_at?: string
          mobile_number?: string | null
          national_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'users_auth0_org_id_fkey1'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: { Args: { permission: string }; Returns: boolean }
      org_id: { Args: never; Returns: string }
    }
    Enums: {
      attendance_status: 'present' | 'late' | 'absent' | 'leave' | 'holiday'
      check_in_method: 'qr' | 'biometric' | 'whatsapp' | 'manual' | 'georefrence'
      forecast_alert_severity: 'low' | 'medium' | 'high' | 'critical'
      forecast_alert_status: 'open' | 'acknowledged' | 'resolved' | 'dismissed'
      forecast_alert_type:
        'overtime_risk' | 'staffing_shortage' | 'understaffed_shift' | 'burnout_risk'
      organization_role: 'owner' | 'admin' | 'manager' | 'member'
      organization_status: 'provisioning' | 'active' | 'suspended' | 'offboarding' | 'archived'
      subscription_plan: 'free' | 'growth' | 'pro' | 'enterprise' | 'starter'
      subscription_status: 'free' | 'active' | 'past_due' | 'canceled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ['present', 'late', 'absent', 'leave', 'holiday'],
      check_in_method: ['qr', 'biometric', 'whatsapp', 'manual', 'georefrence'],
      forecast_alert_severity: ['low', 'medium', 'high', 'critical'],
      forecast_alert_status: ['open', 'acknowledged', 'resolved', 'dismissed'],
      forecast_alert_type: [
        'overtime_risk',
        'staffing_shortage',
        'understaffed_shift',
        'burnout_risk',
      ],
      organization_role: ['owner', 'admin', 'manager', 'member'],
      organization_status: ['provisioning', 'active', 'suspended', 'offboarding', 'archived'],
      subscription_plan: ['free', 'growth', 'pro', 'enterprise', 'starter'],
      subscription_status: ['free', 'active', 'past_due', 'canceled'],
    },
  },
} as const

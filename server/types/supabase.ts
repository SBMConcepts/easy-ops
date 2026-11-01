export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
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
          resource_id: string
          resource_type: string | null
        }
        Insert: {
          action: string
          auth0_org_id: string
          auth0_user_id: string
          created_at?: string
          diff?: Json
          id?: string
          resource_id?: string
          resource_type?: string | null
        }
        Update: {
          action?: string
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          diff?: Json
          id?: string
          resource_id?: string
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'user_credentials'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
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
      billing_webhook_events: {
        Row: {
          auth0_org_id: string | null
          event_key: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider: string
          provider_reference: string | null
          received_at: string
        }
        Insert: {
          auth0_org_id?: string | null
          event_key: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          provider: string
          provider_reference?: string | null
          received_at?: string
        }
        Update: {
          auth0_org_id?: string | null
          event_key?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          provider_reference?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'billing_webhook_events_org_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      csm_assignments: {
        Row: {
          auth0_org_id: string
          calendar_url: string | null
          created_at: string
          csm_email: string
          csm_name: string
          csm_phone: string | null
          csm_title: string | null
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          auth0_org_id: string
          calendar_url?: string | null
          created_at?: string
          csm_email: string
          csm_name: string
          csm_phone?: string | null
          csm_title?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          calendar_url?: string | null
          created_at?: string
          csm_email?: string
          csm_name?: string
          csm_phone?: string | null
          csm_title?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'csm_assignments_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      incident_reports: {
        Row: {
          actions_taken: string | null
          auth0_org_id: string
          created_at: string
          department_id: string | null
          description: string
          id: string
          incident_type: Database['public']['Enums']['incident_type']
          manager_notes: string | null
          manager_signature: string | null
          manager_signed_at: string | null
          manager_user_id: string | null
          occurred_at: string
          photos: Json
          reporter_id: string
          reporter_signature: string
          reporter_signed_at: string
          severity: Database['public']['Enums']['incident_severity']
          site_id: string | null
          status: Database['public']['Enums']['incident_status']
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          actions_taken?: string | null
          auth0_org_id: string
          created_at?: string
          department_id?: string | null
          description: string
          id?: string
          incident_type: Database['public']['Enums']['incident_type']
          manager_notes?: string | null
          manager_signature?: string | null
          manager_signed_at?: string | null
          manager_user_id?: string | null
          occurred_at?: string
          photos?: Json
          reporter_id: string
          reporter_signature: string
          reporter_signed_at?: string
          severity: Database['public']['Enums']['incident_severity']
          site_id?: string | null
          status?: Database['public']['Enums']['incident_status']
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          actions_taken?: string | null
          auth0_org_id?: string
          created_at?: string
          department_id?: string | null
          description?: string
          id?: string
          incident_type?: Database['public']['Enums']['incident_type']
          manager_notes?: string | null
          manager_signature?: string | null
          manager_signed_at?: string | null
          manager_user_id?: string | null
          occurred_at?: string
          photos?: Json
          reporter_id?: string
          reporter_signature?: string
          reporter_signed_at?: string
          severity?: Database['public']['Enums']['incident_severity']
          site_id?: string | null
          status?: Database['public']['Enums']['incident_status']
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'incident_reports_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'incident_reports_department_fkey'
            columns: ['auth0_org_id', 'department_id']
            isOneToOne: false
            referencedRelation: 'org_departments'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'incident_reports_manager_fkey'
            columns: ['auth0_org_id', 'manager_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'incident_reports_manager_user_id_fkey'
            columns: ['manager_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'incident_reports_reporter_fkey'
            columns: ['auth0_org_id', 'reporter_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'incident_reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'incident_reports_site_fkey'
            columns: ['auth0_org_id', 'site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['auth0_org_id', 'id']
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_member_id: string | null
          auth0_org_id: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string | null
          phone_number: string | null
          revoked_at: string | null
          role: Database['public']['Enums']['org_role']
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_member_id?: string | null
          auth0_org_id: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          phone_number?: string | null
          revoked_at?: string | null
          role?: Database['public']['Enums']['org_role']
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_member_id?: string | null
          auth0_org_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          phone_number?: string | null
          revoked_at?: string | null
          role?: Database['public']['Enums']['org_role']
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
          {
            foreignKeyName: 'invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
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
          metrics: Json
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
          metrics?: Json
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
          metrics?: Json
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
            foreignKeyName: 'labour_alerts_ack_fkey'
            columns: ['auth0_org_id', 'acknowledged_by']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
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
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'labour_alerts_forecast_fkey'
            columns: ['auth0_org_id', 'forecast_id']
            isOneToOne: false
            referencedRelation: 'labour_forecasts'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'labour_alerts_member_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'labour_alerts_site_fkey'
            columns: ['auth0_org_id', 'site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['auth0_org_id', 'id']
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
          input_summary: Json
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
          input_summary?: Json
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
          input_summary?: Json
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
            foreignKeyName: 'labour_forecasts_generated_by_fkey'
            columns: ['generated_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'labour_forecasts_generator_fkey'
            columns: ['auth0_org_id', 'generated_by']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'labour_forecasts_site_fkey'
            columns: ['auth0_org_id', 'site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['auth0_org_id', 'id']
          },
        ]
      }
      org_attendance: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          date: string
          department_id: string
          hours_worked: number
          id: string
          method: Database['public']['Enums']['attendance_method']
          overtime: number
          site_id: string | null
          status: Database['public']['Enums']['attendance_status']
          updated_at: string
        }
        Insert: {
          auth0_org_id: string
          auth0_user_id: string
          created_at?: string
          date: string
          department_id: string
          hours_worked?: number
          id?: string
          method: Database['public']['Enums']['attendance_method']
          overtime?: number
          site_id?: string | null
          status?: Database['public']['Enums']['attendance_status']
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          date?: string
          department_id?: string
          hours_worked?: number
          id?: string
          method?: Database['public']['Enums']['attendance_method']
          overtime?: number
          site_id?: string | null
          status?: Database['public']['Enums']['attendance_status']
          updated_at?: string
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
            foreignKeyName: 'org_attendance_department_fkey'
            columns: ['auth0_org_id', 'department_id']
            isOneToOne: false
            referencedRelation: 'org_departments'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'org_attendance_member_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'org_attendance_site_fkey'
            columns: ['auth0_org_id', 'site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['auth0_org_id', 'id']
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
          auth0_org_id: string
          created_at?: string
          department_name: string
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
          leave_type: Database['public']['Enums']['leave_type']
          updated_at: string
        }
        Insert: {
          auth0_org_id: string
          auth0_user_id: string
          balance_days?: number
          id?: string
          leave_type: Database['public']['Enums']['leave_type']
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          balance_days?: number
          id?: string
          leave_type?: Database['public']['Enums']['leave_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_leave_balances_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'org_leave_balances_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'org_leave_balances_member_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
        ]
      }
      org_members: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          department_id: string | null
          employee_code: string | null
          employment_type: Database['public']['Enums']['employment_type'] | null
          first_name: string
          full_name: string
          hourly_rate: number | null
          id: string
          job_role_id: string | null
          joined_at: string
          last_name: string
          manager_id: string | null
          role: Database['public']['Enums']['org_role']
          shift_id: string | null
          site_id: string | null
          status: Database['public']['Enums']['member_status']
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          department_id?: string | null
          employee_code?: string | null
          employment_type?: Database['public']['Enums']['employment_type'] | null
          first_name?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          job_role_id?: string | null
          joined_at?: string
          last_name?: string
          manager_id?: string | null
          role?: Database['public']['Enums']['org_role']
          shift_id?: string | null
          site_id?: string | null
          status?: Database['public']['Enums']['member_status']
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          department_id?: string | null
          employee_code?: string | null
          employment_type?: Database['public']['Enums']['employment_type'] | null
          first_name?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          job_role_id?: string | null
          joined_at?: string
          last_name?: string
          manager_id?: string | null
          role?: Database['public']['Enums']['org_role']
          shift_id?: string | null
          site_id?: string | null
          status?: Database['public']['Enums']['member_status']
          tax_number?: string | null
          updated_at?: string
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
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'org_members_department_fkey'
            columns: ['auth0_org_id', 'department_id']
            isOneToOne: false
            referencedRelation: 'org_departments'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'org_members_job_role_fkey'
            columns: ['auth0_org_id', 'job_role_id']
            isOneToOne: false
            referencedRelation: 'org_roles'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'org_members_manager_fkey'
            columns: ['auth0_org_id', 'manager_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'org_members_shift_fkey'
            columns: ['auth0_org_id', 'shift_id']
            isOneToOne: false
            referencedRelation: 'org_shifts'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'org_members_site_fkey'
            columns: ['auth0_org_id', 'site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'org_members_user_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: true
            referencedRelation: 'user_credentials'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
        ]
      }
      org_roles: {
        Row: {
          auth0_org_id: string
          base_role: Database['public']['Enums']['org_role'] | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          auth0_org_id: string
          base_role?: Database['public']['Enums']['org_role'] | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          base_role?: Database['public']['Enums']['org_role'] | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
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
      org_roster_shifts: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          end_at: string
          id: string
          site_id: string | null
          start_at: string
          status: Database['public']['Enums']['roster_shift_status']
          updated_at: string
        }
        Insert: {
          auth0_org_id: string
          auth0_user_id: string
          created_at?: string
          end_at: string
          id?: string
          site_id?: string | null
          start_at: string
          status?: Database['public']['Enums']['roster_shift_status']
          updated_at?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          end_at?: string
          id?: string
          site_id?: string | null
          start_at?: string
          status?: Database['public']['Enums']['roster_shift_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_roster_shifts_member_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'org_roster_shifts_site_fkey'
            columns: ['auth0_org_id', 'site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['auth0_org_id', 'id']
          },
        ]
      }
      org_shifts: {
        Row: {
          auth0_org_id: string
          created_at: string
          end_time: string
          grace_period_minutes: number
          id: string
          shift_name: string
          start_time: string
          updated_at: string
          weekly_hours: number | null
        }
        Insert: {
          auth0_org_id: string
          created_at?: string
          end_time: string
          grace_period_minutes?: number
          id?: string
          shift_name: string
          start_time: string
          updated_at?: string
          weekly_hours?: number | null
        }
        Update: {
          auth0_org_id?: string
          created_at?: string
          end_time?: string
          grace_period_minutes?: number
          id?: string
          shift_name?: string
          start_time?: string
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
          created_at: string
          department_id: string
          geo_radius_m: number
          id: string
          latitude: number
          longitude: number
          site_name: string
          updated_at: string
        }
        Insert: {
          address?: string
          auth0_org_id: string
          created_at?: string
          department_id: string
          geo_radius_m?: number
          id?: string
          latitude: number
          longitude: number
          site_name: string
          updated_at?: string
        }
        Update: {
          address?: string
          auth0_org_id?: string
          created_at?: string
          department_id?: string
          geo_radius_m?: number
          id?: string
          latitude?: number
          longitude?: number
          site_name?: string
          updated_at?: string
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
            foreignKeyName: 'org_sites_department_fkey'
            columns: ['auth0_org_id', 'department_id']
            isOneToOne: false
            referencedRelation: 'org_departments'
            referencedColumns: ['auth0_org_id', 'id']
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
          plan: Database['public']['Enums']['org_plan']
          slug: string
          status: Database['public']['Enums']['org_status']
          updated_at: string
        }
        Insert: {
          auth0_org_id: string
          country?: string
          created_at?: string
          industry?: string
          logo_url?: string
          metadata?: Json
          name: string
          plan?: Database['public']['Enums']['org_plan']
          slug: string
          status?: Database['public']['Enums']['org_status']
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
          plan?: Database['public']['Enums']['org_plan']
          slug?: string
          status?: Database['public']['Enums']['org_status']
          updated_at?: string
        }
        Relationships: []
      }
      payroll_export_runs: {
        Row: {
          auth0_org_id: string
          created_at: string
          employee_count: number
          format: Database['public']['Enums']['payroll_export_format']
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
          format?: Database['public']['Enums']['payroll_export_format']
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
          format?: Database['public']['Enums']['payroll_export_format']
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
          {
            foreignKeyName: 'payroll_export_runs_generator_fkey'
            columns: ['auth0_org_id', 'generated_by']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
        ]
      }
      safety_checklist_responses: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          id: string
          notes: string | null
          passed: boolean
          responses: Json
          shift_id: string
          signature_data: string
          signed_at: string
          site_id: string
          template_id: string
        }
        Insert: {
          auth0_org_id: string
          auth0_user_id: string
          created_at?: string
          id?: string
          notes?: string | null
          passed?: boolean
          responses?: Json
          shift_id: string
          signature_data: string
          signed_at?: string
          site_id: string
          template_id: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          passed?: boolean
          responses?: Json
          shift_id?: string
          signature_data?: string
          signed_at?: string
          site_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'safety_checklist_responses_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'safety_checklist_responses_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'safety_responses_member_fkey'
            columns: ['auth0_org_id', 'auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
          {
            foreignKeyName: 'safety_responses_shift_fkey'
            columns: ['auth0_org_id', 'shift_id']
            isOneToOne: false
            referencedRelation: 'org_shifts'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'safety_responses_site_fkey'
            columns: ['auth0_org_id', 'site_id']
            isOneToOne: false
            referencedRelation: 'org_sites'
            referencedColumns: ['auth0_org_id', 'id']
          },
          {
            foreignKeyName: 'safety_responses_template_fkey'
            columns: ['auth0_org_id', 'template_id']
            isOneToOne: false
            referencedRelation: 'safety_checklist_templates'
            referencedColumns: ['auth0_org_id', 'id']
          },
        ]
      }
      safety_checklist_templates: {
        Row: {
          active: boolean
          auth0_org_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          items: Json
          name: string
          required_at_shift_start: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          auth0_org_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          name: string
          required_at_shift_start?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          auth0_org_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          name?: string
          required_at_shift_start?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'safety_checklist_templates_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'safety_templates_creator_fkey'
            columns: ['auth0_org_id', 'created_by']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
        ]
      }
      subscriptions: {
        Row: {
          access_ends_at: string | null
          auth0_org_id: string
          billing_started_at: string | null
          billing_state: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          payment_method_summary: Json
          plan: Database['public']['Enums']['org_plan']
          provider: string | null
          provider_customer_code: string | null
          provider_plan_code: string | null
          provider_reference: string | null
          provider_subscription_code: string | null
          status: Database['public']['Enums']['subscription_status']
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          access_ends_at?: string | null
          auth0_org_id: string
          billing_started_at?: string | null
          billing_state?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_method_summary?: Json
          plan: Database['public']['Enums']['org_plan']
          provider?: string | null
          provider_customer_code?: string | null
          provider_plan_code?: string | null
          provider_reference?: string | null
          provider_subscription_code?: string | null
          status?: Database['public']['Enums']['subscription_status']
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          access_ends_at?: string | null
          auth0_org_id?: string
          billing_started_at?: string | null
          billing_state?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_method_summary?: Json
          plan?: Database['public']['Enums']['org_plan']
          provider?: string | null
          provider_customer_code?: string | null
          provider_plan_code?: string | null
          provider_reference?: string | null
          provider_subscription_code?: string | null
          status?: Database['public']['Enums']['subscription_status']
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
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
      support_messages: {
        Row: {
          auth0_org_id: string
          author_id: string | null
          author_role: Database['public']['Enums']['support_message_author']
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          auth0_org_id: string
          author_id?: string | null
          author_role?: Database['public']['Enums']['support_message_author']
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          auth0_org_id?: string
          author_id?: string | null
          author_role?: Database['public']['Enums']['support_message_author']
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'support_messages_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'support_messages_ticket_fkey'
            columns: ['auth0_org_id', 'ticket_id']
            isOneToOne: false
            referencedRelation: 'support_tickets'
            referencedColumns: ['auth0_org_id', 'id']
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          auth0_org_id: string
          category: Database['public']['Enums']['support_ticket_category']
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          first_response_at: string | null
          id: string
          plan_at_creation: Database['public']['Enums']['org_plan'] | null
          priority: Database['public']['Enums']['support_ticket_priority']
          resolved_at: string | null
          sla_resolution_due: string | null
          sla_response_due: string | null
          status: Database['public']['Enums']['support_ticket_status']
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          auth0_org_id: string
          category?: Database['public']['Enums']['support_ticket_category']
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          first_response_at?: string | null
          id?: string
          plan_at_creation?: Database['public']['Enums']['org_plan'] | null
          priority?: Database['public']['Enums']['support_ticket_priority']
          resolved_at?: string | null
          sla_resolution_due?: string | null
          sla_response_due?: string | null
          status?: Database['public']['Enums']['support_ticket_status']
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          auth0_org_id?: string
          category?: Database['public']['Enums']['support_ticket_category']
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          first_response_at?: string | null
          id?: string
          plan_at_creation?: Database['public']['Enums']['org_plan'] | null
          priority?: Database['public']['Enums']['support_ticket_priority']
          resolved_at?: string | null
          sla_resolution_due?: string | null
          sla_response_due?: string | null
          status?: Database['public']['Enums']['support_ticket_status']
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'support_tickets_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'support_tickets_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'support_tickets_creator_fkey'
            columns: ['auth0_org_id', 'created_by']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id', 'auth0_user_id']
          },
        ]
      }
      user_credentials: {
        Row: {
          address: string | null
          auth0_org_id: string
          auth0_user_id: string
          created_at: string
          email: string | null
          email_verified: boolean
          first_name: string | null
          full_name: string | null
          id: string
          id_type: Database['public']['Enums']['identification_type'] | null
          identity_provider: string
          last_name: string | null
          last_synced_at: string
          mobile_number: string | null
          national_id: string | null
          password_hash: string | null
          phone_verified: boolean
          status: Database['public']['Enums']['credential_status']
          updated_at: string
        }
        Insert: {
          address?: string | null
          auth0_org_id: string
          auth0_user_id?: string
          created_at?: string
          email?: string | null
          email_verified?: boolean
          first_name?: string | null
          full_name?: string | null
          id?: string
          id_type?: Database['public']['Enums']['identification_type'] | null
          identity_provider?: string
          last_name?: string | null
          last_synced_at?: string
          mobile_number?: string | null
          national_id?: string | null
          password_hash?: string | null
          phone_verified?: boolean
          status?: Database['public']['Enums']['credential_status']
          updated_at?: string
        }
        Update: {
          address?: string | null
          auth0_org_id?: string
          auth0_user_id?: string
          created_at?: string
          email?: string | null
          email_verified?: boolean
          first_name?: string | null
          full_name?: string | null
          id?: string
          id_type?: Database['public']['Enums']['identification_type'] | null
          identity_provider?: string
          last_name?: string | null
          last_synced_at?: string
          mobile_number?: string | null
          national_id?: string | null
          password_hash?: string | null
          phone_verified?: boolean
          status?: Database['public']['Enums']['credential_status']
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
            isOneToOne: false
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
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          full_name: string | null
          id: string
          id_type: Database['public']['Enums']['identification_type'] | null
          last_name: string | null
          last_seen_at: string
          mobile_number: string | null
          national_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          auth0_org_id: string
          auth0_user_id: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          id_type?: Database['public']['Enums']['identification_type'] | null
          last_name?: string | null
          last_seen_at?: string
          mobile_number?: string | null
          national_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          auth0_org_id?: string
          auth0_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          id_type?: Database['public']['Enums']['identification_type'] | null
          last_name?: string | null
          last_seen_at?: string
          mobile_number?: string | null
          national_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_auth0_org_id_fkey'
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
      [_ in never]: never
    }
    Enums: {
      attendance_method: 'whatsapp' | 'biometric' | 'ussd' | 'qr'
      attendance_status: 'present' | 'absent' | 'leave' | 'sick_leave'
      credential_status: 'active' | 'blocked' | 'deleted'
      employment_type: 'permanent' | 'contract' | 'part_time' | 'temporary' | 'shift_worker'
      forecast_alert_severity: 'low' | 'medium' | 'high' | 'critical'
      forecast_alert_status: 'open' | 'acknowledged' | 'resolved' | 'dismissed'
      forecast_alert_type:
        | 'understaffed'
        | 'overstaffed'
        | 'overtime_risk'
        | 'absence_spike'
        | 'coverage_gap'
        | 'staffing_shortage'
        | 'understaffed_shift'
        | 'burnout_risk'
      identification_type: 'sa_id' | 'passport'
      incident_severity: 'minor' | 'moderate' | 'serious' | 'fatal'
      incident_status: 'open' | 'under_review' | 'closed'
      incident_type:
        | 'injury'
        | 'near_miss'
        | 'property_damage'
        | 'environmental'
        | 'security'
        | 'vehicle'
        | 'other'
      leave_type: 'annual' | 'sick' | 'family_responsibility'
      member_status: 'active' | 'suspended'
      org_plan: 'trial' | 'starter' | 'growth' | 'pro' | 'enterprise'
      org_role: 'owner' | 'admin' | 'manager' | 'member'
      org_status: 'provisioning' | 'active' | 'suspended' | 'cancelled'
      payroll_export_format: 'csv' | 'xlsx' | 'sage' | 'pastel' | 'xero' | 'custom'
      roster_shift_status: 'scheduled' | 'cancelled'
      subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled'
      support_message_author: 'customer' | 'agent' | 'system'
      support_ticket_category:
        'general' | 'billing' | 'technical' | 'onboarding' | 'feature_request' | 'bug'
      support_ticket_priority: 'low' | 'medium' | 'high' | 'urgent'
      support_ticket_status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed'
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
  public: {
    Enums: {
      attendance_method: ['whatsapp', 'biometric', 'ussd', 'qr'],
      attendance_status: ['present', 'absent', 'leave', 'sick_leave'],
      credential_status: ['active', 'blocked', 'deleted'],
      employment_type: ['permanent', 'contract', 'part_time', 'temporary', 'shift_worker'],
      forecast_alert_severity: ['low', 'medium', 'high', 'critical'],
      forecast_alert_status: ['open', 'acknowledged', 'resolved', 'dismissed'],
      forecast_alert_type: [
        'understaffed',
        'overstaffed',
        'overtime_risk',
        'absence_spike',
        'coverage_gap',
        'staffing_shortage',
        'understaffed_shift',
        'burnout_risk',
      ],
      identification_type: ['sa_id', 'passport'],
      incident_severity: ['minor', 'moderate', 'serious', 'fatal'],
      incident_status: ['open', 'under_review', 'closed'],
      incident_type: [
        'injury',
        'near_miss',
        'property_damage',
        'environmental',
        'security',
        'vehicle',
        'other',
      ],
      leave_type: ['annual', 'sick', 'family_responsibility'],
      member_status: ['active', 'suspended'],
      org_plan: ['trial', 'starter', 'growth', 'pro', 'enterprise'],
      org_role: ['owner', 'admin', 'manager', 'member'],
      org_status: ['provisioning', 'active', 'suspended', 'cancelled'],
      payroll_export_format: ['csv', 'xlsx', 'sage', 'pastel', 'xero', 'custom'],
      roster_shift_status: ['scheduled', 'cancelled'],
      subscription_status: ['trial', 'active', 'past_due', 'cancelled'],
      support_message_author: ['customer', 'agent', 'system'],
      support_ticket_category: [
        'general',
        'billing',
        'technical',
        'onboarding',
        'feature_request',
        'bug',
      ],
      support_ticket_priority: ['low', 'medium', 'high', 'urgent'],
      support_ticket_status: ['open', 'pending', 'in_progress', 'resolved', 'closed'],
    },
  },
} as const

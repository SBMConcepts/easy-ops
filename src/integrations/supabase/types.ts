export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email_domain: string | null
          id: string
          message: string | null
          requester_email: string
          requester_name: string | null
          status: Database['public']['Enums']['access_request_status']
          target_tenant_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email_domain?: string | null
          id?: string
          message?: string | null
          requester_email: string
          requester_name?: string | null
          status?: Database['public']['Enums']['access_request_status']
          target_tenant_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email_domain?: string | null
          id?: string
          message?: string | null
          requester_email?: string
          requester_name?: string | null
          status?: Database['public']['Enums']['access_request_status']
          target_tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'access_requests_decided_by_fkey'
            columns: ['decided_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'access_requests_target_tenant_id_fkey'
            columns: ['target_tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'access_requests_target_tenant_id_fkey'
            columns: ['target_tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      attendance_records: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          hours_worked: number | null
          id: string
          latitude: number | null
          longitude: number | null
          method: Database['public']['Enums']['check_in_method']
          notes: string | null
          overtime: number | null
          site_id: string | null
          status: Database['public']['Enums']['attendance_status']
          tenant_id: string
          updated_at: string
          verified: boolean
          verified_by: string | null
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          hours_worked?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          method?: Database['public']['Enums']['check_in_method']
          notes?: string | null
          overtime?: number | null
          site_id?: string | null
          status?: Database['public']['Enums']['attendance_status']
          tenant_id: string
          updated_at?: string
          verified?: boolean
          verified_by?: string | null
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          method?: Database['public']['Enums']['check_in_method']
          notes?: string | null
          overtime?: number | null
          site_id?: string | null
          status?: Database['public']['Enums']['attendance_status']
          tenant_id?: string
          updated_at?: string
          verified?: boolean
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'attendance_records_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'users'
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
            foreignKeyName: 'attendance_records_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'attendance_records_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_records_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_table: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'audit_log_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      auth0_sync_outbox: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      department_sites: {
        Row: {
          created_at: string
          department_id: string
          site_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          site_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          site_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'department_sites_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'department_sites_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'department_sites_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'department_sites_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          site_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          site_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          site_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'departments_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'departments_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'departments_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      employee_profiles: {
        Row: {
          address: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id_number: string | null
          job_title: string | null
          membership_id: string
          phone: string | null
          site_id: string | null
          start_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id_number?: string | null
          job_title?: string | null
          membership_id: string
          phone?: string | null
          site_id?: string | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id_number?: string | null
          job_title?: string | null
          membership_id?: string
          phone?: string | null
          site_id?: string | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employee_profiles_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_profiles_membership_id_fkey'
            columns: ['membership_id']
            isOneToOne: true
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_profiles_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_profiles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'employee_profiles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          joined_at: string
          role: Database['public']['Enums']['tenant_role']
          status: Database['public']['Enums']['membership_status']
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          joined_at: string
          role?: Database['public']['Enums']['tenant_role']
          status?: Database['public']['Enums']['membership_status']
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          joined_at?: string
          role?: Database['public']['Enums']['tenant_role']
          status?: Database['public']['Enums']['membership_status']
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'memberships_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      organisation_roles: {
        Row: {
          base_role: Database['public']['Enums']['tenant_role']
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_role: Database['public']['Enums']['tenant_role']
          created_at?: string
          id?: string
          name?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_role?: Database['public']['Enums']['tenant_role']
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organisation_roles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'organisation_roles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database['public']['Enums']['app_permission']
          role: Database['public']['Enums']['tenant_role']
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database['public']['Enums']['app_permission']
          role: Database['public']['Enums']['tenant_role']
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database['public']['Enums']['app_permission']
          role?: Database['public']['Enums']['tenant_role']
        }
        Relationships: []
      }
      sales_leads: {
        Row: {
          company_name: string
          country: string | null
          created_at: string
          employee_count: string | null
          full_name: string
          id: string
          message: string | null
          phone: string | null
          selected_plan: string | null
          status: Database['public']['Enums']['lead_status']
          updated_at: string
          work_email: string
        }
        Insert: {
          company_name: string
          country?: string | null
          created_at?: string
          employee_count?: string | null
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          selected_plan?: string | null
          status?: Database['public']['Enums']['lead_status']
          updated_at?: string
          work_email: string
        }
        Update: {
          company_name?: string
          country?: string | null
          created_at?: string
          employee_count?: string | null
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          selected_plan?: string | null
          status?: Database['public']['Enums']['lead_status']
          updated_at?: string
          work_email?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          grace_period_minutes: number
          id: string
          name: string
          site_id: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          grace_period_minutes?: number
          id?: string
          name?: string
          site_id: string
          start_time: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          grace_period_minutes?: number
          id?: string
          name?: string
          site_id?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shifts_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shifts_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'shifts_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sites: {
        Row: {
          address: string
          created_at: string
          geofence_radius_m: number
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          geofence_radius_m?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          geofence_radius_m?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database['public']['Enums']['billing_plan']
          seat_cap: number
          status: Database['public']['Enums']['billing_status']
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database['public']['Enums']['billing_plan']
          seat_cap?: number
          status?: Database['public']['Enums']['billing_status']
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database['public']['Enums']['billing_plan']
          seat_cap?: number
          status?: Database['public']['Enums']['billing_status']
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: true
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'subscriptions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: true
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      tenants: {
        Row: {
          auth0_org_id: string
          country: string
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          settings: Json
          slug: string
          status: Database['public']['Enums']['tenant_status']
        }
        Insert: {
          auth0_org_id: string
          country?: string
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
          status?: Database['public']['Enums']['tenant_status']
        }
        Update: {
          auth0_org_id?: string
          country?: string
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
          status?: Database['public']['Enums']['tenant_status']
        }
        Relationships: []
      }
      users: {
        Row: {
          auth0_user_id: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          password_hash: string | null
          status: Database['public']['Enums']['user_status']
          updated_at: string
        }
        Insert: {
          auth0_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          password_hash?: string | null
          status?: Database['public']['Enums']['user_status']
          updated_at?: string
        }
        Update: {
          auth0_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          password_hash?: string | null
          status?: Database['public']['Enums']['user_status']
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      tenant_active_plan: {
        Row: {
          auth0_org_id: string | null
          billing_status: Database['public']['Enums']['billing_status'] | null
          current_period_end: string | null
          plan: Database['public']['Enums']['billing_plan'] | null
          seat_cap: number | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: []
      }
      tenant_subscription_summary: {
        Row: {
          current_period_end: string | null
          plan: Database['public']['Enums']['billing_plan'] | null
          seat_cap: number | null
          status: Database['public']['Enums']['billing_status'] | null
          tenant_id: string | null
        }
        Insert: {
          current_period_end?: string | null
          plan?: Database['public']['Enums']['billing_plan'] | null
          seat_cap?: number | null
          status?: Database['public']['Enums']['billing_status'] | null
          tenant_id?: string | null
        }
        Update: {
          current_period_end?: string | null
          plan?: Database['public']['Enums']['billing_plan'] | null
          seat_cap?: number | null
          status?: Database['public']['Enums']['billing_status'] | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: true
            referencedRelation: 'tenant_active_plan'
            referencedColumns: ['tenant_id']
          },
          {
            foreignKeyName: 'subscriptions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: true
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      approve_access_request_and_invite: {
        Args: {
          p_default_role?: Database['public']['Enums']['tenant_role']
          p_request_id: string
        }
        Returns: undefined
      }
      check_user_password: {
        Args: { p_email: string; p_password: string }
        Returns: boolean
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      has_permission: {
        Args: { _perm: Database['public']['Enums']['app_permission'] }
        Returns: boolean
      }
      has_tenant_role: {
        Args: { _role: Database['public']['Enums']['tenant_role'] }
        Returns: boolean
      }
      sync_employee_profile_tenant_on_login: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      access_request_status: 'pending' | 'approved' | 'rejected' | 'expired'
      app_permission:
        | 'read:tenant'
        | 'write:tenant'
        | 'admin:tenant'
        | 'read:members'
        | 'invite:members'
        | 'manage:members'
        | 'read:attendance'
        | 'write:attendance'
        | 'verify:attendance'
        | 'manage:departments'
        | 'manage:sites'
        | 'manage:shifts'
        | 'manage:roles'
        | 'read:audit'
        | 'manage:billing'
      attendance_status: 'present' | 'late' | 'absent' | 'leave' | 'holiday'
      billing_plan: 'starter' | 'growth' | 'pro' | 'enterprise'
      billing_status: 'trialing' | 'active' | 'past_due' | 'canceled'
      check_in_method: 'qr' | 'biometric' | 'whatsapp' | 'manual' | 'geofence'
      lead_status:
        | 'new'
        | 'contacted'
        | 'qualified'
        | 'demo_scheduled'
        | 'proposal_sent'
        | 'won'
        | 'lost'
        | 'unresponsive'
      membership_status: 'invited' | 'active' | 'suspended' | 'offboarded'
      tenant_role: 'admin' | 'manager' | 'supervisor' | 'employee' | 'owner'
      tenant_status: 'provisioning' | 'active' | 'suspended' | 'offboarding' | 'archived'
      user_status: 'active' | 'suspended' | 'deleted'
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
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
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
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
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
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
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
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
      access_request_status: ['pending', 'approved', 'rejected', 'expired'],
      app_permission: [
        'tenant:read',
        'tenant:write',
        'tenant:admin',
        'members:read',
        'members:invite',
        'members:manage',
        'attendance:read',
        'attendance:write',
        'attendance:verify',
        'departments:manage',
        'sites:manage',
        'shifts:manage',
        'roles:manage',
        'audit:read',
        'billing:manage',
      ],
      attendance_status: ['present', 'late', 'absent', 'leave', 'holiday'],
      billing_plan: ['starter', 'growth', 'pro', 'enterprise'],
      billing_status: ['trialing', 'active', 'past_due', 'canceled'],
      check_in_method: ['qr', 'biometric', 'whatsapp', 'manual', 'geofence'],
      lead_status: [
        'new',
        'contacted',
        'qualified',
        'demo_scheduled',
        'proposal_sent',
        'won',
        'lost',
        'unresponsive',
      ],
      membership_status: ['invited', 'active', 'suspended', 'offboarded'],
      tenant_role: ['admin', 'manager', 'supervisor', 'employee', 'owner'],
      tenant_status: ['provisioning', 'active', 'suspended', 'offboarding', 'archived'],
      user_status: ['active', 'suspended', 'deleted'],
    },
  },
} as const

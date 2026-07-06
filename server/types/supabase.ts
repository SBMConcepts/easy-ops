export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          auth0_user_id: string
          created_at: string
          diff: Json
          id: string
          auth0_org_id: string
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          auth0_user_id?: string
          created_at?: string
          diff?: Json
          id?: string
          auth0_org_id?: string
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          auth0_user_id?: string
          created_at?: string
          diff?: Json
          id?: string
          auth0_org_id?: string
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'audit_logs_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          auth0_org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          auth0_org_id?: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          auth0_org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      org_attendance: {
        Row: {
          created_at: string
          date: string
          hours_worked: number
          id: string
          method: Database['public']['Enums']['check_in_method']
          auth0_org_id: string
          overtime: number
          auth0_user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours_worked: number
          id?: string
          method: Database['public']['Enums']['check_in_method']
          auth0_org_id?: string
          overtime: number
          auth0_user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          hours_worked?: number
          id?: string
          method?: Database['public']['Enums']['check_in_method']
          auth0_org_id?: string
          overtime?: number
          auth0_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_attendance_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'org_attendance_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: false
            referencedRelation: 'org_members'
            referencedColumns: ['auth0_user_id']
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
      org_members: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          id: string
          joined_at: string
          role: string
          status: string
        }
        Insert: {
          auth0_org_id?: string
          auth0_user_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_members_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: false
            referencedRelation: 'user_credentials'
            referencedColumns: ['auth0_org_id']
          },
          {
            foreignKeyName: 'org_members_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: true
            referencedRelation: 'user_credentials'
            referencedColumns: ['auth0_user_id']
          },
        ]
      }
      org_roles: {
        Row: {
          auth0_org_id: string
          id: string
          name: Database['public']['Enums']['organization_role']
        }
        Insert: {
          auth0_org_id?: string
          id?: string
          name: Database['public']['Enums']['organization_role']
        }
        Update: {
          auth0_org_id?: string
          id?: string
          name?: Database['public']['Enums']['organization_role']
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
          auth0_org_id: string
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
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          auth0_org_id: string
          plan: string
          status: string
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          auth0_org_id?: string
          plan: string
          status?: string
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          auth0_org_id?: string
          plan?: string
          status?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_org_id_fkey'
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
            foreignKeyName: 'user_credentials_auth0_user_id_fkey'
            columns: ['auth0_user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['auth0_user_id']
          },
          {
            foreignKeyName: 'user_credentials_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['auth0_org_id']
          },
        ]
      }
      users: {
        Row: {
          auth0_org_id: string
          auth0_user_id: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_seen_at: string
        }
        Insert: {
          auth0_org_id?: string
          auth0_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          last_seen_at?: string
        }
        Update: {
          auth0_org_id?: string
          auth0_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_auth0_org_id_fkey'
            columns: ['auth0_org_id']
            isOneToOne: true
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
      org_id: { Args: never; Returns: string }
    }
    Enums: {
      attendance_status: 'present' | 'late' | 'absent' | 'leave' | 'holiday'
      check_in_method: 'qr' | 'biometric' | 'whatsapp' | 'manual' | 'georefrence'
      organization_role: 'owner' | 'admin' | 'manager' | 'member'
      organization_status: 'provisioning' | 'active' | 'suspended' | 'offboarding' | 'archived'
      subscription_plan: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'
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
      attendance_status: ['present', 'late', 'absent', 'leave', 'holiday'],
      check_in_method: ['qr', 'biometric', 'whatsapp', 'manual', 'georefrence'],
      organization_role: ['owner', 'admin', 'manager', 'member'],
      organization_status: ['provisioning', 'active', 'suspended', 'offboarding', 'archived'],
      subscription_plan: ['free', 'growth', 'pro', 'enterprise'],
      subscription_status: ['free', 'active', 'past_due', 'canceled'],
    },
  },
} as const

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.5"
    }
    public: {
        Tables: {
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
                    method: Database["public"]["Enums"]["check_in_method"]
                    notes: string | null
                    overtime: number | null
                    site_id: string | null
                    status: Database["public"]["Enums"]["attendance_status"]
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
                    method?: Database["public"]["Enums"]["check_in_method"]
                    notes?: string | null
                    overtime?: number | null
                    site_id?: string | null
                    status?: Database["public"]["Enums"]["attendance_status"]
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
                    method?: Database["public"]["Enums"]["check_in_method"]
                    notes?: string | null
                    overtime?: number | null
                    site_id?: string | null
                    status?: Database["public"]["Enums"]["attendance_status"]
                    updated_at?: string
                    verified?: boolean
                    verified_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "attendance_records_site_id_fkey"
                        columns: ["site_id"]
                        isOneToOne: false
                        referencedRelation: "sites"
                        referencedColumns: ["id"]
                    },
                ]
            }
            audit_log: {
                Row: {
                    action: string
                    created_at: string
                    details: Json | null
                    id: string
                    target_id: string | null
                    target_table: string | null
                    user_id: string | null
                }
                Insert: {
                    action: string
                    created_at?: string
                    details?: Json | null
                    id?: string
                    target_id?: string | null
                    target_table?: string | null
                    user_id?: string | null
                }
                Update: {
                    action?: string
                    created_at?: string
                    details?: Json | null
                    id?: string
                    target_id?: string | null
                    target_table?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
            departments: {
                Row: {
                    created_at: string
                    id: string
                    name: string
                    organisation_id: string | null
                    site_id: string | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    name: string
                    organisation_id?: string | null
                    site_id?: string | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    name?: string
                    organisation_id?: string | null
                    site_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "departments_organisation_id_fkey"
                        columns: ["organisation_id"]
                        isOneToOne: false
                        referencedRelation: "organisations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "departments_site_id_fkey"
                        columns: ["site_id"]
                        isOneToOne: false
                        referencedRelation: "sites"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organisation_roles: {
                Row: {
                    base_role: Database["public"]["Enums"]["app_role"]
                    created_at: string
                    id: string
                    name: string
                    organisation_id: string
                }
                Insert: {
                    base_role: Database["public"]["Enums"]["app_role"]
                    created_at?: string
                    id?: string
                    name: string
                    organisation_id: string
                }
                Update: {
                    base_role?: Database["public"]["Enums"]["app_role"]
                    created_at?: string
                    id?: string
                    name?: string
                    organisation_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "organisation_roles_organisation_id_fkey"
                        columns: ["organisation_id"]
                        isOneToOne: false
                        referencedRelation: "organisations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organisations: {
                Row: {
                    country: string
                    created_at: string
                    created_by: string
                    id: string
                    industry: string | null
                    logo_url: string | null
                    name: string
                    onboarding_completed: boolean
                    settings: Json
                    updated_at: string
                }
                Insert: {
                    country?: string
                    created_at?: string
                    created_by: string
                    id?: string
                    industry?: string | null
                    logo_url?: string | null
                    name: string
                    onboarding_completed?: boolean
                    settings?: Json
                    updated_at?: string
                }
                Update: {
                    country?: string
                    created_at?: string
                    created_by?: string
                    id?: string
                    industry?: string | null
                    logo_url?: string | null
                    name?: string
                    onboarding_completed?: boolean
                    settings?: Json
                    updated_at?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string
                    department: string | null
                    email: string
                    full_name: string
                    id: string
                    organisation_id: string | null
                    site: string | null
                    updated_at: string
                    phone: string | null
                    address: string | null
                    job_title: string | null
                    id_number: string | null
                    date_of_birth: string | null
                    start_date: string | null
                    emergency_contact_name: string | null
                    emergency_contact_phone: string | null
                    bio: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string
                    department?: string | null
                    email?: string
                    full_name?: string
                    id: string
                    organisation_id?: string | null
                    site?: string | null
                    updated_at?: string
                    phone?: string | null
                    address?: string | null
                    job_title?: string | null
                    id_number?: string | null
                    date_of_birth?: string | null
                    start_date?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    bio?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string
                    department?: string | null
                    email?: string
                    full_name?: string
                    id?: string
                    organisation_id?: string | null
                    site?: string | null
                    updated_at?: string
                    phone?: string | null
                    address?: string | null
                    job_title?: string | null
                    id_number?: string | null
                    date_of_birth?: string | null
                    start_date?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    bio?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_organisation_id_fkey"
                        columns: ["organisation_id"]
                        isOneToOne: false
                        referencedRelation: "organisations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            shifts: {
                Row: {
                    created_at: string
                    end_time: string
                    grace_period_minutes: number
                    id: string
                    name: string
                    organisation_id: string | null
                    site_id: string | null
                    start_time: string
                }
                Insert: {
                    created_at?: string
                    end_time: string
                    grace_period_minutes?: number
                    id?: string
                    name: string
                    organisation_id?: string | null
                    site_id?: string | null
                    start_time: string
                }
                Update: {
                    created_at?: string
                    end_time?: string
                    grace_period_minutes?: number
                    id?: string
                    name?: string
                    organisation_id?: string | null
                    site_id?: string | null
                    start_time?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "shifts_organisation_id_fkey"
                        columns: ["organisation_id"]
                        isOneToOne: false
                        referencedRelation: "organisations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "shifts_site_id_fkey"
                        columns: ["site_id"]
                        isOneToOne: false
                        referencedRelation: "sites"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sites: {
                Row: {
                    address: string | null
                    created_at: string
                    geofence_radius_m: number | null
                    id: string
                    latitude: number | null
                    longitude: number | null
                    name: string
                    organisation_id: string | null
                }
                Insert: {
                    address?: string | null
                    created_at?: string
                    geofence_radius_m?: number | null
                    id?: string
                    latitude?: number | null
                    longitude?: number | null
                    name: string
                    organisation_id?: string | null
                }
                Update: {
                    address?: string | null
                    created_at?: string
                    geofence_radius_m?: number | null
                    id?: string
                    latitude?: number | null
                    longitude?: number | null
                    name?: string
                    organisation_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sites_organisation_id_fkey"
                        columns: ["organisation_id"]
                        isOneToOne: false
                        referencedRelation: "organisations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            user_roles: {
                Row: {
                    id: string
                    role: Database["public"]["Enums"]["app_role"]
                    user_id: string
                }
                Insert: {
                    id?: string
                    role: Database["public"]["Enums"]["app_role"]
                    user_id: string
                }
                Update: {
                    id?: string
                    role?: Database["public"]["Enums"]["app_role"]
                    user_id?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_user_department: { Args: { _user_id: string }; Returns: string }
            get_user_role: {
                Args: { _user_id: string }
                Returns: Database["public"]["Enums"]["app_role"]
            }
            get_user_site: { Args: { _user_id: string }; Returns: string }
            has_role: {
                Args: {
                    _role: Database["public"]["Enums"]["app_role"]
                    _user_id: string
                }
                Returns: boolean
            }
        }
        Enums: {
            app_role: "admin" | "manager" | "supervisor" | "employee"
            attendance_status: "present" | "late" | "absent" | "on_leave"
            check_in_method: "qr" | "biometric" | "whatsapp" | "manual"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
            DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] &
            DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
          ? R
          : never
      : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I
        }
          ? I
          : never
      : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U
        }
          ? U
          : never
      : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema["Enums"]
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never

export const Constants = {
    public: {
        Enums: {
            app_role: ["admin", "manager", "supervisor", "employee"],
            attendance_status: ["present", "late", "absent", "on_leave"],
            check_in_method: ["qr", "biometric", "whatsapp", "manual"],
        },
    },
} as const

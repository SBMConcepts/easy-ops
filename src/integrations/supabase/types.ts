// =============================================================================
// integrations/supabase/types.ts
// Auto-generated from post-migration schema
// Reflects: remote schema + schema_audit_and_migration.sql
// DO NOT EDIT MANUALLY — regenerate from schema when tables change.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday'

export type BillingPlan = 'starter' | 'growth' | 'pro' | 'enterprise'

export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export type CheckInMethod = 'qr' | 'biometric' | 'whatsapp' | 'manual' | 'geofence'

/** Lead lifecycle status — replaces the untyped text column from base schema. */
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'demo_scheduled'
  | 'proposal_sent'
  | 'won'
  | 'lost'
  | 'unresponsive'

export type MembershipStatus = 'invited' | 'active' | 'suspended' | 'offboarded'

export type TenantRole = 'admin' | 'manager' | 'supervisor' | 'employee'

export type TenantStatus = 'provisioning' | 'active' | 'suspended' | 'offboarding' | 'archived'

export type UserStatus = 'active' | 'suspended' | 'deleted'

// ---------------------------------------------------------------------------
// Tables — Row, Insert, Update
// Each table exposes three shapes:
//   Row    — what you receive from SELECT
//   Insert — what you supply on INSERT (generated/defaulted columns optional)
//   Update — what you supply on UPDATE (all columns optional)
// ---------------------------------------------------------------------------

// ── access_requests ─────────────────────────────────────────────────────────

export interface AccessRequestRow {
  id: string
  requester_email: string
  requester_name: string | null
  target_tenant_id: string | null
  /** Generated always from requester_email. Never writable. */
  email_domain: string
  message: string | null
  status: AccessRequestStatus
  decided_by: string | null
  decided_at: string | null
  created_at: string
}

export interface AccessRequestInsert {
  id?: string
  requester_email: string
  requester_name?: string | null
  target_tenant_id?: string | null
  message?: string | null
  status?: AccessRequestStatus
  decided_by?: string | null
  decided_at?: string | null
  created_at?: string
  // email_domain is GENERATED ALWAYS — omit on insert
}

export interface AccessRequestUpdate {
  requester_email?: string
  requester_name?: string | null
  target_tenant_id?: string | null
  message?: string | null
  status?: AccessRequestStatus
  decided_by?: string | null
  decided_at?: string | null
  // email_domain is GENERATED ALWAYS — omit on update
}

// ── attendance_records ───────────────────────────────────────────────────────

export interface AttendanceRecordRow {
  id: string
  tenant_id: string
  employee_id: string
  site_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  method: CheckInMethod
  status: AttendanceStatus
  latitude: number | null
  longitude: number | null
  verified: boolean
  verified_by: string | null
  /** Auto-computed from (clock_out - clock_in). Do not write directly. */
  hours_worked: number | null
  /** Auto-computed as MAX(0, hours_worked - 8). Do not write directly. */
  overtime: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecordInsert {
  id?: string
  tenant_id: string
  employee_id: string
  site_id?: string
  date?: string
  clock_in?: string | null
  clock_out?: string | null
  method?: CheckInMethod
  status?: AttendanceStatus
  latitude?: number | null
  longitude?: number | null
  verified?: boolean
  verified_by?: string | null
  /** Computed by trigger — supplying a value will be overwritten. */
  hours_worked?: number | null
  /** Computed by trigger — supplying a value will be overwritten. */
  overtime?: number | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface AttendanceRecordUpdate {
  tenant_id?: string
  employee_id?: string
  site_id?: string
  date?: string
  clock_in?: string | null
  clock_out?: string | null
  method?: CheckInMethod
  status?: AttendanceStatus
  latitude?: number | null
  longitude?: number | null
  verified?: boolean
  verified_by?: string | null
  notes?: string | null
  updated_at?: string
  // hours_worked and overtime are trigger-managed — omit on update
}

// ── audit_log ────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string
  tenant_id: string | null
  user_id: string | null
  action: string
  target_table: string | null
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface AuditLogInsert {
  id?: string
  tenant_id?: string | null
  user_id?: string | null
  action: string
  target_table?: string | null
  target_id?: string | null
  details?: Record<string, unknown>
  created_at?: string
}

// audit_log is append-only — no Update type intentionally.

// ── department_sites (junction — added by migration §7) ─────────────────────

export interface DepartmentSiteRow {
  department_id: string
  site_id: string
  tenant_id: string
  created_at: string
}

export interface DepartmentSiteInsert {
  department_id: string
  site_id: string
  tenant_id: string
  created_at?: string
}

// Junction rows are replaced, not updated — no Update type intentionally.

// ── departments ──────────────────────────────────────────────────────────────

export interface DepartmentRow {
  id: string
  tenant_id: string
  name: string
  /**
   * Legacy shortcut: the department's primary site.
   * Full many-to-many assignments live in department_sites.
   * Not the authoritative source for site membership.
   */
  site_id: string | null
  created_at: string
  updated_at: string
}

export interface DepartmentInsert {
  id?: string
  tenant_id: string
  name?: string
  site_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface DepartmentUpdate {
  name?: string
  site_id?: string | null
  updated_at?: string
}

// ── employee_profiles ────────────────────────────────────────────────────────

export interface EmployeeProfileRow {
  /** Primary key — references memberships.id */
  membership_id: string
  /**
   * Denormalised write-through projection of memberships.tenant_id.
   * Overwritten on every INSERT/UPDATE by trigger — do not set manually.
   */
  tenant_id: string
  site_id: string | null
  department_id: string | null
  job_title: string | null
  id_number: string | null
  date_of_birth: string | null
  start_date: string | null
  phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeProfileInsert {
  membership_id: string
  /** Trigger-managed — supplying a value will be overwritten from memberships. */
  tenant_id?: string
  site_id?: string | null
  department_id?: string | null
  job_title?: string | null
  id_number?: string | null
  date_of_birth?: string | null
  start_date?: string | null
  phone?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  bio?: string | null
  created_at?: string
  updated_at?: string
}

export interface EmployeeProfileUpdate {
  site_id?: string | null
  department_id?: string | null
  job_title?: string | null
  id_number?: string | null
  date_of_birth?: string | null
  start_date?: string | null
  phone?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  bio?: string | null
  updated_at?: string
  // tenant_id and membership_id are immutable after insert
}

// ── memberships ──────────────────────────────────────────────────────────────

export interface MembershipRow {
  id: string
  tenant_id: string
  user_id: string
  role: TenantRole
  status: MembershipStatus
  invited_by: string
  joined_at: string
  created_at: string
  updated_at: string
}

export interface MembershipInsert {
  id?: string
  tenant_id: string
  user_id: string
  role?: TenantRole
  status?: MembershipStatus
  invited_by: string
  joined_at: string
  created_at?: string
  updated_at?: string
}

export interface MembershipUpdate {
  role?: TenantRole
  status?: MembershipStatus
  updated_at?: string
  // tenant_id and user_id are immutable — changing them requires a new row
}

// ── organisation_roles ───────────────────────────────────────────────────────

export interface OrganisationRoleRow {
  id: string
  tenant_id: string
  name: string
  base_role: TenantRole
  created_at: string
  /** Added by migration §3f — was missing from base schema. */
  updated_at: string
}

export interface OrganisationRoleInsert {
  id?: string
  tenant_id: string
  name: string
  base_role: TenantRole
  created_at?: string
  updated_at?: string
}

export interface OrganisationRoleUpdate {
  name?: string
  base_role?: TenantRole
  updated_at?: string
}

// ── sales_leads ──────────────────────────────────────────────────────────────

export interface SalesLeadRow {
  id: string
  full_name: string
  work_email: string
  phone: string | null
  company_name: string
  employee_count: string | null
  /** Constrained to BillingPlan values or null. */
  selected_plan: BillingPlan | null
  country: string | null
  message: string | null
  /** Typed enum — replaces unvalidated text column from base schema. */
  status: LeadStatus
  created_at: string
  updated_at: string
}

export interface SalesLeadInsert {
  id?: string
  full_name: string
  work_email: string
  phone?: string | null
  company_name: string
  employee_count?: string | null
  selected_plan?: BillingPlan | null
  country?: string | null
  message?: string | null
  status?: LeadStatus
  created_at?: string
  updated_at?: string
}

export interface SalesLeadUpdate {
  full_name?: string
  work_email?: string
  phone?: string | null
  company_name?: string
  employee_count?: string | null
  selected_plan?: BillingPlan | null
  country?: string | null
  message?: string | null
  status?: LeadStatus
  updated_at?: string
}

// ── shifts ───────────────────────────────────────────────────────────────────

export interface ShiftRow {
  id: string
  tenant_id: string
  site_id: string
  name: string
  /** Stored as HH:MM:SS — use a time string or parse as needed. */
  start_time: string
  end_time: string
  grace_period_minutes: number
  created_at: string
}

export interface ShiftInsert {
  id?: string
  tenant_id: string
  site_id: string
  name?: string
  start_time: string
  end_time: string
  grace_period_minutes?: number
  created_at?: string
}

export interface ShiftUpdate {
  site_id?: string
  name?: string
  start_time?: string
  end_time?: string
  grace_period_minutes?: number
}

// ── sites ────────────────────────────────────────────────────────────────────

export interface SiteRow {
  id: string
  tenant_id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number
  created_at: string
  updated_at: string
}

export interface SiteInsert {
  id?: string
  tenant_id: string
  name?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  geofence_radius_m?: number
  created_at?: string
  updated_at?: string
}

export interface SiteUpdate {
  name?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  geofence_radius_m?: number
  updated_at?: string
}

// ── subscriptions ────────────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: string
  tenant_id: string
  plan: BillingPlan
  status: BillingStatus
  seat_cap: number
  /** Sensitive — accessible only to tenant admins via RLS (subs_admin_read). */
  stripe_customer_id: string | null
  /** Sensitive — accessible only to tenant admins via RLS (subs_admin_read). */
  stripe_subscription_id: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionInsert {
  id?: string
  tenant_id: string
  plan?: BillingPlan
  status?: BillingStatus
  seat_cap?: number
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
  created_at?: string
  updated_at?: string
}

export interface SubscriptionUpdate {
  plan?: BillingPlan
  status?: BillingStatus
  seat_cap?: number
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
  updated_at?: string
}

// ── tenants ──────────────────────────────────────────────────────────────────

export interface TenantRow {
  id: string
  /** Auth0 Organisation ID (format: org_xxxx). Unique. JWT bridge. */
  auth0_org_id: string
  name: string
  status: TenantStatus
  industry: string | null
  country: string
  logo_url: string | null
  settings: Record<string, unknown>
  created_at: string
  // plan column removed — reads go through tenant_active_plan view
}

export interface TenantInsert {
  id?: string
  auth0_org_id: string
  name: string
  status?: TenantStatus
  industry?: string | null
  country?: string
  logo_url?: string | null
  settings?: Record<string, unknown>
  created_at?: string
}

export interface TenantUpdate {
  name?: string
  status?: TenantStatus
  industry?: string | null
  country?: string
  logo_url?: string | null
  settings?: Record<string, unknown>
  // auth0_org_id is immutable after provisioning
}

// ── users ────────────────────────────────────────────────────────────────────

export interface UserRow {
  /** Auth0 sub claim — text PK (format: provider|id). */
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  status: UserStatus
  /** Auth0 sub claim mirror. Unique. */
  auth0_user_id: string
  /**
   * @deprecated Auth0 is the identity provider.
   * Will be NULL for all Auth0 users and removed in a future migration.
   */
  password_hash: string | null
  created_at: string
  updated_at: string
}

export interface UserInsert {
  id: string
  email: string
  full_name?: string
  avatar_url?: string | null
  status?: UserStatus
  auth0_user_id: string
  password_hash?: string | null
  created_at?: string
  updated_at?: string
}

export interface UserUpdate {
  full_name?: string
  avatar_url?: string | null
  status?: UserStatus
  updated_at?: string
  // id, email, auth0_user_id are immutable
  // password_hash: do not write — deprecated
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * tenant_active_plan
 * Current billing plan for a tenant — no Stripe IDs, safe for all members.
 * Derived from tenants JOIN subscriptions WHERE status IN ('active','trialing').
 */
export interface TenantActivePlanView {
  tenant_id: string
  tenant_name: string
  auth0_org_id: string
  plan: BillingPlan | null
  billing_status: BillingStatus | null
  seat_cap: number | null
  current_period_end: string | null
}

/**
 * tenant_subscription_summary
 * Stripe-ID-free subscription summary.
 * Safe to expose to all tenant members via application queries.
 */
export interface TenantSubscriptionSummaryView {
  tenant_id: string
  plan: BillingPlan
  status: BillingStatus
  seat_cap: number
  current_period_end: string | null
}

// ---------------------------------------------------------------------------
// Supabase Database type — wire everything together for the typed client
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      access_requests: {
        Row: AccessRequestRow
        Insert: AccessRequestInsert
        Update: AccessRequestUpdate
      }
      attendance_records: {
        Row: AttendanceRecordRow
        Insert: AttendanceRecordInsert
        Update: AttendanceRecordUpdate
      }
      audit_log: {
        Row: AuditLogRow
        Insert: AuditLogInsert
        Update: never
      }
      department_sites: {
        Row: DepartmentSiteRow
        Insert: DepartmentSiteInsert
        Update: never
      }
      departments: {
        Row: DepartmentRow
        Insert: DepartmentInsert
        Update: DepartmentUpdate
      }
      employee_profiles: {
        Row: EmployeeProfileRow
        Insert: EmployeeProfileInsert
        Update: EmployeeProfileUpdate
      }
      memberships: {
        Row: MembershipRow
        Insert: MembershipInsert
        Update: MembershipUpdate
      }
      organisation_roles: {
        Row: OrganisationRoleRow
        Insert: OrganisationRoleInsert
        Update: OrganisationRoleUpdate
      }
      sales_leads: {
        Row: SalesLeadRow
        Insert: SalesLeadInsert
        Update: SalesLeadUpdate
      }
      shifts: {
        Row: ShiftRow
        Insert: ShiftInsert
        Update: ShiftUpdate
      }
      sites: {
        Row: SiteRow
        Insert: SiteInsert
        Update: SiteUpdate
      }
      subscriptions: {
        Row: SubscriptionRow
        Insert: SubscriptionInsert
        Update: SubscriptionUpdate
      }
      tenants: {
        Row: TenantRow
        Insert: TenantInsert
        Update: TenantUpdate
      }
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
      }
    }
    Views: {
      tenant_active_plan: {
        Row: TenantActivePlanView
      }
      tenant_subscription_summary: {
        Row: TenantSubscriptionSummaryView
      }
    }
    Enums: {
      access_request_status: AccessRequestStatus
      attendance_status: AttendanceStatus
      billing_plan: BillingPlan
      billing_status: BillingStatus
      check_in_method: CheckInMethod
      lead_status: LeadStatus
      membership_status: MembershipStatus
      tenant_role: TenantRole
      tenant_status: TenantStatus
      user_status: UserStatus
    }
    Functions: {
      current_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      current_user_id: {
        Args: Record<string, never>
        Returns: string
      }
      has_tenant_role: {
        Args: { _role: TenantRole }
        Returns: boolean
      }
      approve_access_request_and_invite: {
        Args: {
          p_request_id: string
          p_default_role?: TenantRole
        }
        Returns: void
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience aliases — use these in component and hook files
// ---------------------------------------------------------------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// ---------------------------------------------------------------------------
// Joined / composite types — common query result shapes
// ---------------------------------------------------------------------------

/** Membership row with the user's display fields resolved. */
export interface MembershipWithUser extends MembershipRow {
  user: Pick<UserRow, 'id' | 'email' | 'full_name' | 'avatar_url' | 'status'>
}

/** Membership row with the employee profile attached (nullable — not all members have profiles). */
export interface MembershipWithProfile extends MembershipRow {
  employee_profile: EmployeeProfileRow | null
}

/** Full member record — membership + user + profile in one shape. */
export interface FullMemberRecord extends MembershipRow {
  user: Pick<UserRow, 'id' | 'email' | 'full_name' | 'avatar_url' | 'status'>
  employee_profile: EmployeeProfileRow | null
}

/** Department with its sites resolved from the junction table. */
export interface DepartmentWithSites extends DepartmentRow {
  department_sites: DepartmentSiteRow[]
}

/** Attendance record with the employee's display name resolved. */
export interface AttendanceRecordWithEmployee extends AttendanceRecordRow {
  employee: Pick<UserRow, 'id' | 'full_name' | 'avatar_url'>
}

/** Shift with its parent site resolved. */
export interface ShiftWithSite extends ShiftRow {
  site: Pick<SiteRow, 'id' | 'name' | 'address'>
}

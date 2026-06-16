import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../integrations/supabase/client'

import type { Database } from '../integrations/supabase/types'

type TenantRole = Database['public']['Enums']['tenant_role']
type MembershipStatus = Database['public']['Enums']['membership_status']
type UserStatus = Database['public']['Enums']['user_status']
type BillingPlan = Database['public']['Enums']['billing_plan']
type BillingStatus = Database['public']['Enums']['billing_status']
type TenantStatus = Database['public']['Enums']['tenant_status']

// =============================================================================
// useCurrentUser
//
// Fetches and caches the authenticated user's full profile directly from
// Supabase (RLS-scoped). This is the canonical source for enriched profile
// data in components that need it outside the AuthContext (settings pages,
// profile editors, admin panels that display the current operator).
//
// Relationship with AuthContext:
//   AuthContext.user  — lightweight session identity (always available after
//                       login, drives role guards)
//   useCurrentUser    — full enriched profile with membership, tenant, plan
//                       and employee-profile details, cached via React Query
// =============================================================================

// ── Response contract ─────────────────────────────────────────────────────────
// The flattened shape components consume. Assembled client-side from several
// RLS-scoped Supabase reads keyed off the active session.

export interface CurrentUserProfile {
  // ── from public.users ──────────────────────────────────────────────────────
  profile_id: string // users.id (Supabase auth uid)
  email: string
  full_name: string
  avatar_url: string | null
  user_status: UserStatus

  // ── from public.memberships ────────────────────────────────────────────────
  tenant_id: string
  role: TenantRole
  membership_status: MembershipStatus
  joined_at: string | null // ISO timestamp

  // ── from public.tenants ────────────────────────────────────────────────────
  tenant_name: string
  tenant_status: TenantStatus
  tenant_logo: string | null
  tenant_country: string
  tenant_industry: string | null

  // ── from tenant_active_plan view ───────────────────────────────────────────
  plan: BillingPlan | null
  billing_status: BillingStatus | null
  seat_cap: number | null
  current_period_end: string | null

  // ── from public.employee_profiles (null if no profile row) ──────────────────
  assigned_site_id: string | null
  phone: string | null
  address: string | null
  job_title: string | null
}

// ── Query key factory ────────────────────────────────────────────────────────
// Centralised so invalidation and prefetching reference the same key shape.

export const currentUserKeys = {
  all: ['current-user'] as const,
  profile: (id: string | undefined) => ['current-user', 'profile', id] as const,
}

// ── Loader ───────────────────────────────────────────────────────────────────

async function loadCurrentUserProfile(userId: string): Promise<CurrentUserProfile | null> {
  const [{ data: userRow }, { data: membershipRows }] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, full_name, avatar_url, status')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('memberships')
      .select(
        'id, role, status, joined_at, tenant_id, tenants(name, status, logo_url, country, industry)'
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true, nullsFirst: false })
      .limit(1),
  ])

  const membership = membershipRows?.[0]
  if (!userRow || !membership) return null

  const tenant = membership.tenants as {
    name: string
    status: TenantStatus
    logo_url: string | null
    country: string
    industry: string | null
  } | null

  const [{ data: plan }, { data: employeeProfile }] = await Promise.all([
    supabase
      .from('tenant_active_plan')
      .select('plan, billing_status, seat_cap, current_period_end')
      .eq('tenant_id', membership.tenant_id)
      .maybeSingle(),
    supabase
      .from('employee_profiles')
      .select('site_id, phone, address, job_title')
      .eq('membership_id', membership.id)
      .maybeSingle(),
  ])

  return {
    profile_id: userRow.id,
    email: userRow.email,
    full_name: userRow.full_name,
    avatar_url: userRow.avatar_url,
    user_status: userRow.status,

    tenant_id: membership.tenant_id,
    role: membership.role,
    membership_status: membership.status,
    joined_at: membership.joined_at,

    tenant_name: tenant?.name ?? '',
    tenant_status: tenant?.status ?? 'active',
    tenant_logo: tenant?.logo_url ?? null,
    tenant_country: tenant?.country ?? '',
    tenant_industry: tenant?.industry ?? null,

    plan: plan?.plan ?? null,
    billing_status: plan?.billing_status ?? null,
    seat_cap: plan?.seat_cap ?? null,
    current_period_end: plan?.current_period_end ?? null,

    assigned_site_id: employeeProfile?.site_id ?? null,
    phone: employeeProfile?.phone ?? null,
    address: employeeProfile?.address ?? null,
    job_title: employeeProfile?.job_title ?? null,
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  const { isAuthenticated, isLoading: isAuthLoading, user: authUser } = useAuth()
  const queryClient = useQueryClient()

  const userId = authUser?.id || undefined

  const query = useQuery({
    queryKey: currentUserKeys.profile(userId),
    queryFn: () => loadCurrentUserProfile(userId as string),
    // Only run when AuthContext has confirmed identity
    enabled: isAuthenticated && !!userId,
    // 5 minutes: profile data is slow-changing; role/plan changes trigger
    // explicit invalidation via refetchProfile()
    staleTime: 1000 * 60 * 5,
  })

  /**
   * Force a fresh fetch — call this after:
   * - The user edits their own profile (name, avatar)
   * - An admin changes this user's role
   * - A billing plan change is confirmed
   */
  const refetchProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: currentUserKeys.all })
  }

  const profile = query.data ?? undefined

  return {
    // ── Enriched DB profile (available after first successful query) ─────────
    profile,

    // ── Convenience accessors ─────────────────────────────────────────────────
    /** Null until profile loads */
    role: profile?.role ?? null,
    membershipStatus: profile?.membership_status ?? null,
    /** True only when membership is in the active state */
    isMembershipActive: profile?.membership_status === 'active',

    // ── Loading / error state ─────────────────────────────────────────────────
    isLoading: isAuthLoading || query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    // ── Actions ───────────────────────────────────────────────────────────────
    refetchProfile,
    isAuthenticated,
  }
}

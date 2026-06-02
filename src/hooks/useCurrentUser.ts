import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { useAuth } from '../contexts/AuthContext'
import { useTenantApi } from './useTenantApi'
import type {
  TenantRole,
  MembershipStatus,
  UserStatus,
  BillingPlan,
  BillingStatus,
  TenantStatus,
} from '../integrations/supabase/types'

// =============================================================================
// useCurrentUser
//
// Fetches and caches the authenticated user's full profile from the Express
// backend (/api/user/me). This is the canonical source for profile data in
// components that need it outside the AuthContext (e.g. settings pages,
// profile editors, admin panels that display the current operator).
//
// Relationship with AuthContext:
//   AuthContext.user  — lightweight session identity (always available after
//                       login, no extra query needed, drives role guards)
//   useCurrentUser    — full enriched profile with membership details,
//                       cached and refetchable via React Query
//
// They share the same backend endpoint so the data is identical; the
// distinction is cache lifecycle and subscription granularity.
// =============================================================================

// ── Response contract ─────────────────────────────────────────────────────────
// Documents the exact shape /api/user/me must return.
// Keep this in sync with the Express route response serialiser.

export interface CurrentUserProfile {
  // ── from public.users ──────────────────────────────────────────────────────
  profile_id: string // users.id (Auth0 sub)
  auth0_user_id: string // users.auth0_user_id
  email: string
  full_name: string
  avatar_url: string | null
  user_status: UserStatus

  // ── from public.memberships ────────────────────────────────────────────────
  tenant_id: string
  role: TenantRole
  membership_status: MembershipStatus
  joined_at: string // ISO timestamp

  // ── from public.tenants ────────────────────────────────────────────────────
  tenant_name: string
  tenant_auth0_org: string
  tenant_status: TenantStatus
  tenant_logo: string | null
  tenant_country: string
  tenant_industry: string | null

  // ── from tenant_active_plan view ───────────────────────────────────────────
  plan: BillingPlan | null
  billing_status: BillingStatus | null
  seat_cap: number | null
  current_period_end: string | null
}

// ── Query key factory ────────────────────────────────────────────────────────
// Centralised so invalidation and prefetching reference the same key shape.

export const currentUserKeys = {
  all: ['current-user'] as const,
  profile: (sub: string | undefined) => ['current-user', 'profile', sub] as const,
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  const { user: auth0User, isLoading: isAuth0Loading } = useAuth0()
  const { isAuthenticated, user: authUser } = useAuth()
  const { apiFetch } = useTenantApi()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: currentUserKeys.profile(authUser?.id ?? auth0User?.sub),
    queryFn: () => apiFetch<CurrentUserProfile>('user/me'),
    // Only run when AuthContext has confirmed identity — avoids a 401 flash on mount
    enabled: isAuthenticated && !!(authUser?.id ?? auth0User?.sub),
    // 5 minutes: profile data is slow-changing; role/plan changes trigger
    // explicit invalidation via refreshProfile() or refetch()
    staleTime: 1000 * 60 * 5,
    // On a 401, do not retry — the session is gone; Auth0 will handle re-auth
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.startsWith('401')) return false
      return failureCount < 2
    },
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

  const profile = query.data

  return {
    // ── Raw Auth0 session (always available after login) ─────────────────────
    auth0User,

    // ── Enriched DB profile (available after first successful query) ─────────
    profile,

    // ── Convenience accessors ─────────────────────────────────────────────────
    /** Null until profile loads */
    role: profile?.role ?? null,
    membershipStatus: profile?.membership_status ?? null,
    /** True only when membership is in the active state */
    isMembershipActive: profile?.membership_status === 'active',

    // ── Loading / error state ─────────────────────────────────────────────────
    isLoading: isAuth0Loading || query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    // ── Actions ───────────────────────────────────────────────────────────────
    refetchProfile,
    isAuthenticated,
  }
}

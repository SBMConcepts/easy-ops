import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'

// Access tier — mirrors org_members.role (owner|admin|member|viewer).
type OrgRole = 'owner' | 'admin' | 'member' | 'viewer'
// org_members.status CHECK (active|suspended).
type MembershipStatus = 'active' | 'suspended'

// =============================================================================
// useCurrentUser
//
// Fetches and caches the authenticated user's full profile from the Express
// backend (/api/userinfo). This is the canonical source for profile data in
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
// Documents the exact shape /api/userinfo must return.
// Keep this in sync with the Express route response serialiser.

export interface CurrentUserProfile {
  // ── from public.users ──────────────────────────────────────────────────────
  profile_id: string // users.id (uuid surrogate)
  auth0_user_id: string // users.auth0_user_id (Auth0 sub)
  auth0_org_id: string
  email: string
  full_name: string
  avatar_url: string | null
  user_status: string

  // ── from public.org_members ────────────────────────────────────────────────
  org_id: string // org_members.org_id (the Auth0 org id, text)
  role: OrgRole
  membership_status: MembershipStatus
  joined_at: string // ISO timestamp

  // ── from public.organizations ──────────────────────────────────────────────
  org_name: string
  org_auth0_id: string
  org_status: string
  org_logo: string | null // organizations.metadata ->> 'logo_url'
  org_country: string // organizations.metadata ->> 'country'
  org_industry: string | null // organizations.metadata ->> 'industry'

  // ── from public.subscriptions ──────────────────────────────────────────────
  plan: string | null
  billing_status: string | null
  current_period_end: string | null

  // ── reintegrated with the operational schema (not returned by v2 core) ──────
  seat_cap?: number | null
  assigned_site_id?: string | null
  phone?: string | null
  address?: string | null
  job_title?: string | null
}

// ── Query key factory ────────────────────────────────────────────────────────
// Centralised so invalidation and prefetching reference the same key shape.

export const currentUserKeys = {
  all: ['current-user'] as const,
  profile: (sub: string | undefined) => ['current-user', 'profile', sub] as const,
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  const { isAuthenticated, user: authUser, isLoading: isAuthLoading } = useAuth()
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: currentUserKeys.profile(authUser?.id ?? undefined),
    queryFn: () => apiFetch<CurrentUserProfile>('/userinfo'),
    // Only run when AuthContext has confirmed identity — avoids a 401 flash on mount
    enabled: isAuthenticated && !!authUser?.id,
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

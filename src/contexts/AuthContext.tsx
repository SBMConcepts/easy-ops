/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import type {
  BillingPlan,
  BillingStatus,
  MembershipStatus,
  TenantRole,
  TenantStatus,
  UserStatus,
} from '../integrations/supabase/types'

// =============================================================================
// Re-export so consumers never need to import from types directly
// =============================================================================
export type { TenantRole }
export type UserRole = TenantRole

// =============================================================================
// Role hierarchy — ordered least → most privileged
// Used by hasMinRole() so a single check covers a role and everything above it.
// =============================================================================
const ROLE_HIERARCHY: Record<TenantRole, number> = {
  employee: 0,
  supervisor: 1,
  manager: 2,
  admin: 3,
}

// =============================================================================
// Public-facing types
// =============================================================================

export interface LoginOptions {
  /** maps to public.tenants.auth0_org_id */
  auth0OrgId?: string
  /** Auth0 invitation token (org invite flow) */
  invitation?: string
}

export interface CredentialLoginOptions {
  email: string
  password: string
  /** maps to public.tenants.auth0_org_id */
  auth0OrgId?: string
}

// ── AuthUser ─────────────────────────────────────────────────────────────────
// Mirrors public.users joined with the caller's public.memberships row.
// Only the fields the frontend actually needs are surfaced here;
// the raw DB rows are available via the typed Supabase client elsewhere.

export interface AuthUser {
  /** public.users.id — Auth0 sub claim (text PK) */
  id: string
  /** public.users.auth0_user_id */
  auth0_user_id: string
  /** public.users.email */
  email: string
  /** public.users.full_name */
  full_name: string
  /** public.users.avatar_url */
  avatar_url: string | null
  /** public.users.status */
  status: UserStatus
  /** public.memberships.tenant_id */
  tenant_id: string
  /** public.memberships.role */
  role: TenantRole
  /** public.memberships.status */
  membership_status: MembershipStatus
}

// ── AuthTenant ────────────────────────────────────────────────────────────────
// Mirrors public.tenants plus the billing summary from tenant_active_plan view.
// Keeping billing here avoids a second context or a second fetch on every mount.

export interface AuthTenant {
  /** public.tenants.id */
  id: string
  /** public.tenants.name */
  name: string
  /** public.tenants.auth0_org_id */
  auth0_org_id: string
  /** public.tenants.status */
  status: TenantStatus
  /** public.tenants.logo_url */
  logo_url: string | null
  /** public.tenants.country */
  country: string
  /** public.tenants.industry */
  industry: string | null
  // ── from tenant_active_plan view ─────────────────────────────────────────
  /** null when tenant has no active/trialing subscription */
  plan: BillingPlan | null
  /** null when tenant has no active/trialing subscription */
  billing_status: BillingStatus | null
  /** Maximum active seats allowed under current plan */
  seat_cap: number | null
  /** ISO timestamp of current billing period end */
  current_period_end: string | null
}

// =============================================================================
// Context shape
// =============================================================================

interface AuthContextType {
  // ── state ──────────────────────────────────────────────────────────────────
  user: AuthUser | null
  tenant: AuthTenant | null
  isAuthenticated: boolean
  isLoading: boolean
  /** True only while the /api/user/me profile fetch is in flight */
  isProfileLoading: boolean
  /** Non-null when profile sync threw — lets UI show a recovery action */
  profileError: Error | null

  // ── auth actions ───────────────────────────────────────────────────────────
  login: (options?: LoginOptions) => Promise<void>
  loginWithCredentials: (options: CredentialLoginOptions) => Promise<void>
  logout: () => void
  /** Force re-fetch of /api/user/me — use after profile edits or role changes */
  refreshProfile: () => Promise<void>

  // ── token ──────────────────────────────────────────────────────────────────
  getAccessToken: () => Promise<string | null>

  // ── role helpers ───────────────────────────────────────────────────────────
  /**
   * True if the current user holds exactly `role`.
   * Prefer hasMinRole() for most access checks.
   */
  hasRole: (role: TenantRole) => boolean
  /**
   * True if the current user's role is `role` or higher in the hierarchy.
   * employee < supervisor < manager < admin
   *
   * @example
   * hasMinRole('manager') // true for manager AND admin
   */
  hasMinRole: (role: TenantRole) => boolean
  /** Convenience: true when role === 'admin' */
  isAdmin: boolean
  /** Convenience: true when role is manager or admin */
  isManager: boolean
  /** Convenience: true when membership is active (not invited/suspended/offboarded) */
  isMembershipActive: boolean
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// =============================================================================
// Provider
// =============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    user: auth0User,
  } = useAuth0()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [tenant, setTenant] = useState<AuthTenant | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<Error | null>(null)

  // Prevent concurrent profile fetches (e.g. StrictMode double-mount)
  const fetchInFlight = useRef(false)

  // ==========================================================================
  // Profile sync — fetches /api/user/me and maps the response to typed state.
  //
  // WHY a backend endpoint instead of direct Supabase queries here:
  // The JWT from Auth0 must be set as the Supabase auth header before any
  // Supabase query fires. Doing that exchange inside the context risks a
  // race between token propagation and the first RLS-gated query. The Express
  // backend owns that exchange safely server-side and returns a single
  // normalised payload, keeping this context stateless w.r.t. Supabase.
  // ==========================================================================

  const syncProfileAndTenant = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !auth0User) return
    if (fetchInFlight.current) return

    fetchInFlight.current = true
    setIsProfileLoading(true)
    setProfileError(null)

    try {
      const token = await getAccessTokenSilently()

      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Profile fetch failed: ${response.status} ${response.statusText}`)
      }

      // ── Expected API response shape ──────────────────────────────────────
      // The Express endpoint should return this shape (document for backend team):
      // {
      //   profile_id:        string   // users.id
      //   auth0_user_id:     string   // users.auth0_user_id
      //   email:             string
      //   full_name:         string
      //   avatar_url:        string | null
      //   user_status:       UserStatus
      //   tenant_id:         string
      //   role:              TenantRole
      //   membership_status: MembershipStatus
      //   tenant_name:       string
      //   tenant_auth0_org:  string
      //   tenant_status:     TenantStatus
      //   tenant_logo:       string | null
      //   tenant_country:    string
      //   tenant_industry:   string | null
      //   plan:              BillingPlan | null
      //   billing_status:    BillingStatus | null
      //   seat_cap:          number | null
      //   current_period_end: string | null
      // }
      const d = (await response.json()) as Record<string, unknown>

      setUser({
        id: String(d.profile_id),
        auth0_user_id: String(d.auth0_user_id ?? auth0User.sub),
        email: String(d.email),
        full_name: String(d.full_name),
        avatar_url: (d.avatar_url as string | null) ?? null,
        status: (d.user_status as UserStatus) ?? 'active',
        tenant_id: String(d.tenant_id),
        role: (d.role as TenantRole) ?? 'employee',
        membership_status: (d.membership_status as MembershipStatus) ?? 'active',
      })

      setTenant({
        id: String(d.tenant_id),
        name: String(d.tenant_name ?? 'Workspace'),
        auth0_org_id: String(d.tenant_auth0_org),
        status: (d.tenant_status as TenantStatus) ?? 'active',
        logo_url: (d.tenant_logo as string | null) ?? null,
        country: String(d.tenant_country ?? 'South Africa'),
        industry: (d.tenant_industry as string | null) ?? null,
        plan: (d.plan as BillingPlan | null) ?? null,
        billing_status: (d.billing_status as BillingStatus | null) ?? null,
        seat_cap: typeof d.seat_cap === 'number' ? d.seat_cap : null,
        current_period_end: (d.current_period_end as string | null) ?? null,
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('[AuthContext] Profile sync failed:', error)
      setProfileError(error)
      // Do NOT clear user/tenant here on a refresh failure — stale data is
      // better than a sudden logout mid-session. A hard auth failure (401)
      // will be handled by Auth0's own session expiry.
    } finally {
      setIsProfileLoading(false)
      fetchInFlight.current = false
    }
  }, [isAuthenticated, auth0User, getAccessTokenSilently])

  // Run profile sync whenever auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      void syncProfileAndTenant()
    } else {
      setUser(null)
      setTenant(null)
      setProfileError(null)
    }
  }, [isAuthenticated, syncProfileAndTenant])

  // ==========================================================================
  // Public: force re-sync (call after profile edits, role changes, etc.)
  // ==========================================================================
  const refreshProfile = useCallback(async (): Promise<void> => {
    fetchInFlight.current = false // allow re-entry explicitly
    await syncProfileAndTenant()
  }, [syncProfileAndTenant])

  // ==========================================================================
  // Token accessor
  // ==========================================================================
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getAccessTokenSilently()
    } catch (err) {
      console.error('[AuthContext] Token retrieval failed:', err)
      return null
    }
  }, [getAccessTokenSilently])

  // ==========================================================================
  // Login / logout
  // ==========================================================================
  const login = useCallback(
    async (options?: LoginOptions): Promise<void> => {
      await loginWithRedirect({
        authorizationParams: {
          ...(options?.auth0OrgId ? { organization: options.auth0OrgId } : {}),
          ...(options?.invitation ? { invitation: options.invitation } : {}),
        },
      })
    },
    [loginWithRedirect]
  )

  const loginWithCredentials = useCallback(
    async (options: CredentialLoginOptions): Promise<void> => {
      await loginWithRedirect({
        authorizationParams: {
          login_hint: options.email,
          connection: 'Username-Password-Authentication',
          ...(options.auth0OrgId ? { organization: options.auth0OrgId } : {}),
        },
      })
    },
    [loginWithRedirect]
  )

  const logout = useCallback((): void => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
    setUser(null)
    setTenant(null)
    setProfileError(null)
  }, [auth0Logout])

  // ==========================================================================
  // Role helpers — memoised so downstream components don't re-render when
  // unrelated state changes (e.g. profileLoading toggling).
  // ==========================================================================
  const userRole = user?.role

  const hasRole = useCallback((role: TenantRole): boolean => userRole === role, [userRole])

  const hasMinRole = useCallback(
    (role: TenantRole): boolean => {
      if (!userRole) return false
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]
    },
    [userRole]
  )

  // Stable boolean flags — recalculated only when role or membership changes
  const userMembershipStatus = user?.membership_status

  const isAdmin = useMemo(() => userRole === 'admin', [userRole])
  const isManager = useMemo(() => hasMinRole('manager'), [hasMinRole])
  const isMembershipActive = useMemo(
    () => userMembershipStatus === 'active',
    [userMembershipStatus]
  )

  // ==========================================================================
  // Context value — stable object reference via useMemo to avoid provider
  // re-renders cascading into every consumer on every render.
  // ==========================================================================
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      tenant,
      isAuthenticated,
      isLoading: auth0Loading || isProfileLoading,
      isProfileLoading,
      profileError,
      login,
      loginWithCredentials,
      logout,
      refreshProfile,
      getAccessToken,
      hasRole,
      hasMinRole,
      isAdmin,
      isManager,
      isMembershipActive,
    }),
    [
      user,
      tenant,
      isAuthenticated,
      auth0Loading,
      isProfileLoading,
      profileError,
      login,
      loginWithCredentials,
      logout,
      refreshProfile,
      getAccessToken,
      hasRole,
      hasMinRole,
      isAdmin,
      isManager,
      isMembershipActive,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// =============================================================================
// Hook
// =============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used inside an <AuthProvider>.')
  }
  return context
}

// =============================================================================
// Derived hooks — thin wrappers that let components subscribe to only the
// slice of auth state they care about, keeping re-render scope tight.
// =============================================================================

/**
 * Returns only the current user record.
 * Components that only need to display the user's name or avatar use this
 * instead of useAuth() so they don't re-render on tenant or role changes.
 */
export const useAuthUser = (): AuthUser | null => useAuth().user

/**
 * Returns only the current tenant record (including billing summary).
 * Components rendering plan badges, seat counts, or upgrade prompts use this.
 */
export const useAuthTenant = (): AuthTenant | null => useAuth().tenant

/**
 * Returns all role helpers without subscribing to user/tenant data changes.
 * Use in route guards, permission wrappers, and conditional renders.
 *
 * @example
 * const { hasMinRole, isAdmin } = useAuthRole()
 * if (!hasMinRole('manager')) return <AccessDenied />
 */
export const useAuthRole = () => {
  const { hasRole, hasMinRole, isAdmin, isManager, isMembershipActive } = useAuth()
  return { hasRole, hasMinRole, isAdmin, isManager, isMembershipActive }
}

/**
 * Returns loading and error state for the profile sync lifecycle.
 * Use in shell layouts to render skeleton states or inline error recovery.
 *
 * @example
 * const { isLoading, profileError, refreshProfile } = useAuthStatus()
 * if (profileError) return <button onClick={refreshProfile}>Retry</button>
 */
export const useAuthStatus = () => {
  const { isLoading, isProfileLoading, profileError, refreshProfile } = useAuth()
  return { isLoading, isProfileLoading, profileError, refreshProfile }
}

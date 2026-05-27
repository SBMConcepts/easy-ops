import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createSupabaseClient } from '../integrations/supabase/client'
import type { AppRole } from '../integrations/supabase/types'

// ── Public types ─────────────────────────────────────────────────────────────

export type UserRole = AppRole

export interface LoginOptions {
  // matches public.tenants.auth0_org_id
  auth0OrgId?: string
  invitation?: string
}

export interface CredentialLoginOptions {
  email: string
  password: string
  // matches public.tenants.auth0_org_id
  auth0OrgId?: string
}

export interface Tenant {
  id: string // public.tenants.id (uuid)

  name: string // public.tenants.name

  slug: string // public.tenants.slug

  logo_url?: string | null // public.tenants.logo_url

  status: string // public.tenants.status (tenant_status enum)
}

export interface User {
  // matches public.users.id
  id: string
  // keep for compatibility with your current naming
  auth0_user_id: string
  email: string
  full_name: string
  avatar_url?: string | null // Scoped Data (from public.memberships)
  tenant_id: string // public.memberships.tenant_id (uuid)
  role: UserRole // public.memberships.role (tenant_role enum)
  // Optional employee scoped data
  job_title?: string | null
}

interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  isLoading: boolean
  /** Redirect to Auth0 Universal Login. Pass auth0OrgId on subdomain workspaces. */
  login: (options?: LoginOptions) => void
  /**
   * Pre-fill the Auth0 Universal Login page with an email/password and redirect.
   * Auth0 SPAs cannot use the Resource Owner Password grant directly, so this
   * redirects to Universal Login with login_hint pre-filled and the database
   * connection forced. The user lands back in the app after Auth0 verifies them.
   */
  loginWithCredentials: (options: CredentialLoginOptions) => Promise<void>
  /** Clear local state and redirect to Auth0 logout endpoint. */
  logout: () => void
  /** Re-fetch the tenant record from Supabase */
  refreshTenant: () => Promise<void>
  /** Raw Auth0 access token for the current session (null when logged out). */
  session: string | null
  /** Helper to grab the raw JWT */
  getAccessToken: () => Promise<string | undefined>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  session: null,
  login: () => {},
  loginWithCredentials: async () => {},
  logout: () => {},
  refreshTenant: async () => {},
  getAccessToken: async () => undefined,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0()

  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [session, setSession] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const getAccessToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently()
    } catch (e) {
      console.warn('Failed to get access token silently', e)
      return undefined
    }
  }, [getAccessTokenSilently])

  // Helper to fetch the Tenant record
  const fetchTenant = async (tenantId: string, token: string) => {
    const supabase = createSupabaseClient(token)
    const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single()

    if (error) {
      console.error('Error fetching tenant:', error)
      return null
    }
    return data as Tenant
  }

  // Hydrate local state when Auth0 authentication is confirmed
  useEffect(() => {
    let mounted = true

    const loadProfileAndTenant = async () => {
      if (!isAuthenticated || !auth0User) {
        if (mounted) {
          setUser(null)
          setTenant(null)
          setSession(null)
          setProfileLoading(false)
        }
        return
      }

      setProfileLoading(true)
      const token = await getAccessToken()
      if (!token) {
        if (mounted) setProfileLoading(false)
        return
      }

      if (mounted) setSession(token)

      const supabase = createSupabaseClient(token)
      const auth0UserId = auth0User.sub!
      // `org_id` is set natively by Auth0 Organizations on every token.
      const auth0OrgId = auth0User.org_id as string | undefined

      try {
        // 1. Fetch Global User (by users.id == Auth0 sub)
        const { data: globalUser, error: userErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', auth0UserId)
          .single()

        if (userErr || !globalUser) throw new Error('Global user not found')

        const finalUser: User = {
          id: globalUser.id,
          email: globalUser.email,
          full_name: globalUser.full_name,
          avatar_url: globalUser.avatar_url,
          tenant_id: '',
          role: 'employee',
          auth0_user_id: auth0UserId,
          // job_title is optional
        }

        // 2. If logged into a specific tenant, resolve it directly from JWT org_id
        if (auth0OrgId) {
          const { data: tenantData, error: tenantErr } = await supabase
            .from('tenants')
            .select('*')
            .eq('auth0_org_id', auth0OrgId)
            .single()

          if (tenantData && !tenantErr) {
            if (mounted) setTenant(tenantData as Tenant)
            finalUser.tenant_id = tenantData.id

            // memberships table (NOT tenant_memberships)
            const { data: membership, error: membershipErr } = await supabase
              .from('memberships')
              .select('id, role')
              .eq('user_id', globalUser.id)
              .eq('tenant_id', tenantData.id)
              .single()

            if (membership && !membershipErr) {
              finalUser.role = membership.role

              // employee_profiles links via membership_id (NOT user_id)
              const { data: hrProfile } = await supabase
                .from('employee_profiles')
                .select('job_title')
                .eq('membership_id', membership.id)
                .eq('tenant_id', tenantData.id)
                .single()

              if (hrProfile) finalUser.job_title = hrProfile.job_title
            }
          }
        }

        if (mounted) setUser(finalUser)
      } catch (err) {
        console.error('Failed to load user context:', err)
      } finally {
        if (mounted) setProfileLoading(false)
      }
    }

    loadProfileAndTenant()

    return () => {
      mounted = false
    }
  }, [isAuthenticated, auth0User, getAccessToken])

  const refreshTenant = useCallback(async () => {
    if (!user?.tenant_id) return
    const token = await getAccessToken()
    if (!token) return
    const updatedTenant = await fetchTenant(user.tenant_id, token)
    if (updatedTenant) setTenant(updatedTenant)
  }, [user, getAccessToken])

  const login = useCallback(
    (options?: LoginOptions) => {
      loginWithRedirect({
        authorizationParams: {
          ...(options?.auth0OrgId ? { organization: options.auth0OrgId } : {}),
          ...(options?.invitation ? { invitation: options.invitation } : {}),
        },
      })
    },
    [loginWithRedirect]
  )
  /**
   * Redirects to Auth0 Universal Login with the email pre-filled (login_hint)
   * and the username/password database connection forced.
   *
   * Auth0 does not permit the Resource Owner Password grant on public SPA clients,
   * so this is the correct pattern: we hand off to Universal Login rather than
   * exchanging credentials directly. The user never leaves the Auth0-hosted page
   * for the actual credential check, keeping the flow secure.
   *
   * If you need fully embedded (no redirect) credential login you must enable the
   * Resource Owner Password grant on a Confidential client and proxy via your
   * Express backend — see route.auth.password-grant.ts.
   */
  const loginWithCredentials = useCallback(
    async (options: CredentialLoginOptions) => {
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

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
    setUser(null)
    setTenant(null)
    setSession(null)
  }, [auth0Logout])

  const isLoading = auth0Loading || profileLoading

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated,
        isLoading,
        session,
        login,
        loginWithCredentials,
        logout,
        refreshTenant,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

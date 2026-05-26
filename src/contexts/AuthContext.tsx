import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createSupabaseClient } from '../integrations/supabase/client'
import type { AppRole } from '../integrations/supabase/types'
import { AUTH0_CLAIM_NS } from '../lib/auth0-config'

// ── Public types ─────────────────────────────────────────────────────────────

export type UserRole = AppRole

interface LoginOptions {
  auth0OrgId?: string
  invitation?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url?: string
  status: string
}

export interface User {
  id: string // From public.users
  auth0_user_id: string
  email: string
  full_name: string
  avatar_url?: string

  // Scoped Data
  tenant_id: string // From public.tenant_memberships
  role: UserRole // From public.tenant_memberships
  job_title?: string // From public.employee_profiles
}

interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  isLoading: boolean
  /** Redirect to Auth0 Universal Login. Pass auth0OrgId on subdomain workspaces. */
  login: (options?: LoginOptions) => void
  /** Clear local state and redirect to Auth0 logout endpoint. */
  logout: () => void
  /** Re-fetch the tenant record from Supabase */
  refreshTenant: () => Promise<void>
  /** Helper to grab the raw JWT */
  getAccessToken: () => Promise<string | undefined>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
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

      const supabase = createSupabaseClient(token)
      const auth0UserId = auth0User.sub!
      const auth0OrgId = auth0User[`${AUTH0_CLAIM_NS}org_id`] as string | undefined

      try {
        // 1. Fetch Global User
        const { data: globalUser, error: userErr } = await supabase
          .from('users')
          .select('*')
          .eq('auth0_user_id', auth0UserId)
          .single()

        if (userErr || !globalUser) throw new Error('Global user not found')

        const finalUser: User = {
          id: globalUser.id,
          auth0_user_id: globalUser.auth0_user_id,
          email: globalUser.email,
          full_name: globalUser.full_name,
          avatar_url: globalUser.avatar_url,
          tenant_id: '',
          role: 'employee',
        }

        // 2. If logged into a specific tenant, fetch membership & HR profile
        if (auth0OrgId) {
          // Note: In a real app, you'd resolve localTenantId first.
          // Assuming your Supabase RLS policies are using the JWT's org_id securely.

          const { data: membership } = await supabase
            .from('tenant_memberships')
            .select('tenant_id, role')
            .eq('user_id', globalUser.id)
            .single()

          if (membership) {
            finalUser.tenant_id = membership.tenant_id
            finalUser.role = membership.role

            const { data: hrProfile } = await supabase
              .from('employee_profiles')
              .select('job_title')
              .eq('user_id', globalUser.id)
              .eq('tenant_id', membership.tenant_id)
              .single()

            if (hrProfile) {
              finalUser.job_title = hrProfile.job_title
            }

            // Load the Tenant object
            const tenantData = await fetchTenant(membership.tenant_id, token)
            if (mounted && tenantData) {
              setTenant(tenantData)
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
        authorizationParams: options?.auth0OrgId ? { organization: options.auth0OrgId } : undefined,
      })
    },
    [loginWithRedirect]
  )

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
    setUser(null)
    setTenant(null)
  }, [auth0Logout])

  const isLoading = auth0Loading || profileLoading

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated,
        isLoading,
        login,
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

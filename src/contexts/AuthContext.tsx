/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useDB } from './DatabaseContext'
import type { Database } from '../integrations/supabase/types'

export type TenantRole = Database['public']['Enums']['tenant_role']
export type AuthTenant = Database['public']['Tables']['tenants']['Row']
export type AuthUser = Database['public']['Tables']['users']['Row'] & { role: TenantRole }

interface AuthContextType {
  user: AuthUser | null
  tenant: AuthTenant | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (options?: { auth0OrgId?: string; invitation?: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
})

const CLAIM_NAMESPACE = 'https://easy-ops-za.vercel.app/'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getIdTokenClaims,
  } = useAuth0()

  const supabase = useDB()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [tenant, setTenant] = useState<AuthTenant | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  useEffect(() => {
    if (auth0Loading || !supabase) return

    const fetchIdentity = async () => {
      if (!isAuthenticated || !auth0User?.sub) {
        setIsProfileLoading(false)
        return
      }

      try {
        const claims = await getIdTokenClaims()
        const orgId = claims?.[`${CLAIM_NAMESPACE}org_id`] as string
        const role = (claims?.[`${CLAIM_NAMESPACE}role`] as TenantRole) || 'employee'

        if (!orgId) {
          setIsProfileLoading(false)
          return
        }

        // Fetch User and Tenant concurrently using RLS
        const [userRes, tenantRes] = await Promise.all([
          supabase.from('users').select('*').eq('auth0_user_id', auth0User.sub).single(),
          supabase.from('tenants').select('*').eq('auth0_org_id', orgId).single(),
        ])

        if (userRes.data) setUser({ ...userRes.data, role })
        if (tenantRes.data) setTenant(tenantRes.data)
      } catch (err) {
        console.error('Failed to sync profile context:', err)
      } finally {
        setIsProfileLoading(false)
      }
    }

    void fetchIdentity()
  }, [auth0Loading, isAuthenticated, auth0User, supabase, getIdTokenClaims])

  const login = useCallback(
    async (options?: { auth0OrgId?: string; invitation?: string }) => {
      await loginWithRedirect({
        authorizationParams: {
          organization: options?.auth0OrgId,
          invitation: options?.invitation,
        },
      })
    },
    [loginWithRedirect]
  )

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
  }, [auth0Logout])

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        tenant: tenant || null,
        isAuthenticated,
        isLoading: auth0Loading || isProfileLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// Role Helpers
const ROLE_HIERARCHY: Record<TenantRole, number> = {
  employee: 0,
  supervisor: 1,
  manager: 2,
  admin: 3,
}

export const useAuthRole = () => {
  const { user } = useAuth()

  const hasMinRole = (required: TenantRole) => {
    if (!user) return false
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[required]
  }

  return {
    hasMinRole,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isSupervisor: hasMinRole('supervisor'),
  }
}

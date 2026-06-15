/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import type { Database } from '../integrations/supabase/types'
import { useTenantApi } from '../hooks/useTenantApi'
import type { CurrentUserProfile } from '../hooks/useCurrentUser'
import { AUTH0_CLAIM_NS } from '../lib/auth0-config'

export type TenantRole = Database['public']['Enums']['tenant_role']
// Bridges the generated enum (regenerated from the DB) with the new permissions
// added in migration 20260613000001 until `supabase gen types` is re-run. Keep
// in sync with public.app_permission / docs/permissions.txt.
export type AppPermission =
  | Database['public']['Enums']['app_permission']
  | 'read:own-profile'
  | 'update:own-profile'
  | 'read:sites'
  | 'read:departments'
  | 'read:shifts'
  | 'read:access-requests'
  | 'approve:access-requests'
  | 'read:compliance'
  | 'read:reports'
  | 'export:reports'
  | 'read:tenant-analytics'
  | 'read:billing'
  | 'export:audit'
  | 'manage:security'
  | 'manage:integrations'
  | 'read:payroll'
  | 'manage:payroll'
  | 'read:benefits'
  | 'manage:benefits'
export type AuthTenant = Database['public']['Tables']['tenants']['Row']
export type AuthUser = Database['public']['Tables']['users']['Row'] & { role: TenantRole }

interface AuthContextType {
  user: AuthUser
  tenant: AuthTenant
  permissions: AppPermission[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (options?: { auth0OrgId?: string; invitation?: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: { id: '', auth0_user_id: '', full_name: '', email: '', role: 'admin' } as AuthUser,
  tenant: {} as AuthTenant,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getIdTokenClaims,
  } = useAuth0()

  const { apiFetch } = useTenantApi()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [tenant, setTenant] = useState<AuthTenant | null>(null)
  const [permissions, setPermissions] = useState<AppPermission[]>([])
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  useEffect(() => {
    if (auth0Loading) return

    const fetchIdentity = async () => {
      if (!isAuthenticated || !auth0User?.sub) {
        setUser(null)
        setTenant(null)
        setPermissions([])
        setIsProfileLoading(false)
        return
      }

      setIsProfileLoading(true)

      try {
        // Role + permissions are sourced from the Auth0 JWT custom claims
        // (authoritative for guards). Permissions are injected by the post-login
        // Action from the DB role_permissions source of truth.
        const claims = await getIdTokenClaims()
        const role = claims?.[`${AUTH0_CLAIM_NS}role`] as TenantRole
        const claimPermissions = claims?.[`${AUTH0_CLAIM_NS}permissions`]
        setPermissions(Array.isArray(claimPermissions) ? (claimPermissions as AppPermission[]) : [])

        // Enriched user + tenant come from the Express backend, which reads
        // Supabase with the verified token. This is the single source of truth
        // for identity/organisation data across the workspace shell.
        const profile = await apiFetch<CurrentUserProfile>('/userinfo')

        setUser({
          id: profile.profile_id,
          auth0_user_id: profile.auth0_user_id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          status: profile.user_status,
          created_at: '',
          updated_at: '',
          role,
        } as AuthUser)

        setTenant({
          id: profile.tenant_id,
          name: profile.tenant_name,
          auth0_org_id: profile.tenant_auth0_org,
          status: profile.tenant_status,
          logo_url: profile.tenant_logo,
          country: profile.tenant_country,
          industry: profile.tenant_industry,
          slug: '',
          settings: {},
          created_at: '',
          updated_at: '',
        } as AuthTenant)
      } catch (err) {
        console.error('Failed to load profile context:', err)
        setUser(null)
        setTenant(null)
        setPermissions([])
      } finally {
        setIsProfileLoading(false)
      }
    }

    void fetchIdentity()
  }, [auth0Loading, isAuthenticated, auth0User, apiFetch, getIdTokenClaims])

  const login = useCallback(
    async (options?: { auth0OrgId?: string; invitation?: string }) => {
      await loginWithRedirect({
        authorizationParams: {
          organization: options?.auth0OrgId,
          invitation: options?.invitation,
          redirect_uri: window.location.origin + '/app', // Ensure we return to the app root after login
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
        user:
          user ||
          ({ id: '', auth0_user_id: '', full_name: '', email: '', role: 'employee' } as AuthUser),
        tenant: tenant || ({} as AuthTenant),
        permissions,
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
  owner: 4,
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
    isManager: hasMinRole('manager'),
    isSupervisor: hasMinRole('supervisor'),
  }
}

// Permission Helpers — capability gating backed by the JWT permissions claim
// (DB role_permissions is the source of truth). Prefer these over role checks
// for gating specific actions; reserve role checks for tier/redirect logic.
export const usePermissions = () => {
  const { permissions } = useAuth()

  const hasPermission = (permission: AppPermission) => permissions.includes(permission)
  const hasAnyPermission = (...required: AppPermission[]) =>
    required.some((p) => permissions.includes(p))
  const hasAllPermissions = (...required: AppPermission[]) =>
    required.every((p) => permissions.includes(p))

  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions }
}

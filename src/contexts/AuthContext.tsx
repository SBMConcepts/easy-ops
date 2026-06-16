/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Database } from '../integrations/supabase/types'
import { supabase } from '../integrations/supabase/client'

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

export interface LoginResult {
  error: string | null
}

interface AuthContextType {
  user: AuthUser
  tenant: AuthTenant
  permissions: AppPermission[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: { id: '', full_name: '', email: '', role: 'employee' } as AuthUser,
  tenant: {} as AuthTenant,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ error: null }),
  logout: async () => {},
  refresh: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tenant, setTenant] = useState<AuthTenant | null>(null)
  const [permissions, setPermissions] = useState<AppPermission[]>([])
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  // Resolves the workspace identity straight from Supabase using the active
  // session: the user profile, their first active membership (role + tenant),
  // and the permissions granted to that role. RLS scopes every query.
  const loadIdentity = useCallback(async (userId: string) => {
    const [{ data: profile }, { data: membershipRows }] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase
        .from('memberships')
        .select('role, status, joined_at, tenant_id, tenants(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true, nullsFirst: false })
        .limit(1),
    ])

    const membership = membershipRows?.[0] ?? null
    const role = (membership?.role ?? 'employee') as TenantRole

    let perms: AppPermission[] = []
    if (membership?.role) {
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', membership.role)
      perms = (rolePerms ?? []).map((r) => r.permission as AppPermission)
    }

    setUser(profile ? ({ ...profile, role } as AuthUser) : null)
    setTenant((membership?.tenants ?? null) as AuthTenant | null)
    setPermissions(perms)
  }, [])

  const hydrate = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession?.user?.id) {
        setUser(null)
        setTenant(null)
        setPermissions([])
        setIsProfileLoading(false)
        return
      }

      setIsProfileLoading(true)
      try {
        await loadIdentity(nextSession.user.id)
      } catch (err) {
        console.error('Failed to load profile context:', err)
        setUser(null)
        setTenant(null)
        setPermissions([])
      } finally {
        setIsProfileLoading(false)
      }
    },
    [loadIdentity]
  )

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      void hydrate(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      void hydrate(nextSession)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [hydrate])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refresh = useCallback(async () => {
    if (session?.user?.id) await loadIdentity(session.user.id)
  }, [session, loadIdentity])

  return (
    <AuthContext.Provider
      value={{
        user: user || ({} as AuthUser), // Avoid spreading null into the context value before the first profile load completes
        tenant: tenant || ({} as AuthTenant),
        permissions,
        isAuthenticated: !!session,
        isLoading: isProfileLoading,
        login,
        logout,
        refresh,
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

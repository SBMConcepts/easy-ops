/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useOrgApi } from '../hooks/useOrgApi'
import type { CurrentUserProfile } from '../hooks/useCurrentUser'
import type { Permission } from '../lib/permissions'

export type OrgRole = 'owner' | 'admin' | 'manager' | 'member'

export interface AuthUser {
  id: string // users.id (uuid surrogate)
  auth0_org_id: string
  auth0_user_id: string
  email: string
  full_name: string
  avatar_url: string | null
  user_status: string
  role: OrgRole
  permissions: Permission[]
}

export interface AuthOrganization {
  id: string // organizations.auth0_org_id (text)
  auth0_org_id: string
  name: string
  slug: string | null
  status: string
  plan: string | null
  logo_url: string | null
  country: string | null
  industry: string | null
}

interface AuthContextType {
  user: AuthUser
  organization: AuthOrganization
  isAuthenticated: boolean
  isLoading: boolean
  login: (options?: { auth0OrgId?: string; invitation?: string }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: {
    id: '',
    auth0_user_id: '',
    auth0_org_id: '',
    full_name: '',
    email: '',
    role: 'owner',
  } as AuthUser,
  organization: {} as AuthOrganization,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiFetch } = useOrgApi()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [organization, setOrganization] = useState<AuthOrganization | null>(null)

  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>('loading')

  // Fetch the current profile from the backend and map it into auth/org state.
  const loadProfile = useCallback(async () => {
    const profile = await apiFetch<CurrentUserProfile>('/userinfo')

    setUser({
      id: profile.profile_id,
      auth0_user_id: profile.auth0_user_id,
      auth0_org_id: profile.auth0_org_id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      user_status: profile.user_status,
      role: profile.role,
      permissions: profile.permissions ?? [],
    })

    setOrganization({
      id: profile.org_id,
      name: profile.org_name,
      auth0_org_id: profile.auth0_org_id,
      status: profile.org_status,
      plan: profile.plan,
      logo_url: profile.org_logo,
      country: profile.org_country,
      industry: profile.org_industry,
      slug: null,
    })
  }, [apiFetch])

  const refreshUser = useCallback(async () => {
    try {
      await loadProfile()
    } catch (err) {
      console.error('Failed to refresh profile context:', err)
    }
  }, [loadProfile])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        await apiFetch('/session')
      } catch {
        if (!cancelled) {
          setUser(null)
          setOrganization(null)
          setStatus('anon')
        }
        return
      }

      try {
        await loadProfile()
      } catch (err) {
        console.error('Failed to load profile context:', err)
        if (!cancelled) {
          setUser(null)
          setOrganization(null)
        }
      } finally {
        if (!cancelled) setStatus('authed')
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [apiFetch, loadProfile])

  const login = useCallback(async (options?: { auth0OrgId?: string; invitation?: string }) => {
    const params = new URLSearchParams()
    if (options?.auth0OrgId) params.set('organization', options.auth0OrgId)
    if (options?.invitation) params.set('invitation', options.invitation)
    const qs = params.toString()
    window.location.href = `/api/login${qs ? `?${qs}` : ''}`
  }, [])

  const logout = useCallback(() => {
    window.location.href = '/api/logout'
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user: user || ({} as AuthUser),
        organization: organization || ({} as AuthOrganization),
        isAuthenticated: status === 'authed',
        isLoading: status === 'loading',
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  member: 0,
  manager: 1,
  admin: 2,
  owner: 3,
}

export const useAuthRole = () => {
  const { user } = useAuth()

  const hasMinRole = (required: OrgRole) => {
    if (!user) return false
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[required]
  }

  // Scope-based gate that matches the server (requirePermission) and RLS
  // (has_permission). Prefer this over role tiers for action gating.
  const hasPermission = (permission: Permission) => {
    return !!user?.permissions?.includes(permission)
  }

  return {
    hasMinRole,
    hasPermission,
    isOwner: user?.role === 'owner',
    isManager: hasMinRole('manager'),
    isAdmin: hasMinRole('admin'),
    isMember: hasMinRole('member'),
  }
}

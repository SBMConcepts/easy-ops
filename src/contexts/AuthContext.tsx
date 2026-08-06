/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useOrgApi } from '../hooks/useOrgApi'
import type { CurrentUserProfile } from '../hooks/useCurrentUser'
import type { Permission } from '../lib/permissions'

export type OrgRole = 'owner' | 'admin' | 'manager' | 'member'

export interface AuthUser {
  id: AuthUser['auth0_user_id'] // profiles.auth0_user_id (text)
  auth0_org_id: string
  auth0_user_id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
  department_id: string
  department_name: string
  manager_id: string
  manager_name: string
  avatar_url: string
  mobile_number: string
  address: string
  employment_type: string
  employee_code: string
  site_id: string
  site_name: string
  job_role_id: string
  job_role_name: string
  shift_id: string
  shift_name: string
  hourly_rate: number
  tax_number: string
  national_id: string
  id_type: 'sa_id' | 'passport'
  emergency_contact_name: string
  emergency_contact_phone: string
  status: string
  role: OrgRole
  permissions: Permission[]
}

export interface AuthOrganization {
  id: AuthOrganization['auth0_org_id'] // organizations.auth0_org_id (text)
  auth0_org_id: string
  name: string
  slug: string | null
  plan: string | null
  status: string | 'active'
  industry: string | ''
  country: string | ''
  logo_url: string | ''
  metadata: Record<string, any>
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
    auth0_org_id: '',
    auth0_user_id: '',
    full_name: '',
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    department_name: '',
    manager_id: '',
    manager_name: '',
    avatar_url: '',
    mobile_number: '',
    address: '',
    employment_type: '',
    employee_code: '',
    site_id: '',
    site_name: '',
    job_role_id: '',
    job_role_name: '',
    shift_id: '',
    shift_name: '',
    hourly_rate: 0,
    tax_number: '',
    national_id: '',
    id_type: 'sa_id',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    status: '',
    role: 'owner' as OrgRole,
    permissions: [],
  } as AuthUser,
  organization: {
    auth0_org_id: '',
    name: '',
    slug: '',
    plan: '',
    status: '',
    industry: '',
    country: '',
    logo_url: '',
    metadata: {},
  } as AuthOrganization,
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
      id: profile.auth0_user_id,
      auth0_org_id: profile.auth0_org_id,
      auth0_user_id: profile.auth0_user_id,
      full_name: profile.full_name,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      department_id: profile.department_id || '',
      department_name: profile.department_name || '',
      manager_id: profile.manager_id || '',
      manager_name: profile.manager_name || '',
      avatar_url: profile.avatar_url || '',
      mobile_number: profile.mobile_number || '',
      address: profile.address || '',
      employment_type: profile.employment_type || '',
      employee_code: profile.employee_code || '',
      site_id: profile.site_id || '',
      site_name: profile.site_name || '',
      job_role_id: profile.job_role_id || '',
      job_role_name: profile.job_role_name || '',
      shift_id: profile.shift_id || '',
      shift_name: profile.shift_name || '',
      hourly_rate: profile.hourly_rate || 0,
      tax_number: profile.tax_number || '',
      national_id: profile.national_id || '',
      id_type: profile.id_type || 'sa_id',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_phone: profile.emergency_contact_phone || '',
      status: profile.status || '',
      role: profile.role,
      permissions: profile.permissions ?? [],
    })

    setOrganization({
      id: profile.auth0_org_id,
      name: profile.org_name,
      auth0_org_id: profile.auth0_org_id,
      status: profile.org_status,
      plan: profile.plan,
      logo_url: profile.org_logo || '',
      country: profile.org_country,
      industry: profile.org_industry || '',
      slug: profile.org_name.toLowerCase().replace(/\s+/g, '-'),
      metadata: {},
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
        if (!cancelled) setStatus('authed')
      } catch (err) {
        console.error('Failed to load profile context:', err)
        if (!cancelled) {
          setUser(null)
          setOrganization(null)
          // Profile load failed: stay anon, not "authed" — otherwise LoginPage
          // and ProtectedRoute disagree on auth state and loop between routes.
          setStatus('anon')
        }
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

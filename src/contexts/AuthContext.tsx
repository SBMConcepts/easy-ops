/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useOrgApi } from '../hooks/useOrgApi'
import type { CurrentUserProfile } from '../hooks/useCurrentUser'

// Access tiers — mirror the org_members.role CHECK constraint
// (owner > admin > member > viewer). These are the ONLY role values used for
// gating across the workspace. Job roles (org_roles) are mapped down to these
// tiers server-side (see server/lib/rbac.ts).
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer'
// Schema v2 identity shapes. Deliberately hand-written (not derived from the
// generated Supabase Row types) so the context survives `supabase gen types`
// against the organizations/org_members model. The org key (`id`/`auth0_org_id`)
// is the Auth0 org id (text).
export interface AuthUser {
  id: string // users.id (uuid surrogate)
  auth0_org_id: string
  auth0_user_id: string
  email: string
  full_name: string
  avatar_url: string | null
  user_status: string
  role: OrgRole
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
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiFetch } = useOrgApi()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [organization, setOrganization] = useState<AuthOrganization | null>(null)
  // 'loading' until the backend session is probed; 'authed' once a valid session
  // cookie is confirmed; 'anon' otherwise.
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>('loading')

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      // 1. Probe the server-side OIDC session. 401 → no session cookie.
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

      // 2. Authenticated — load the enriched profile + organization. This is the
      //    single source of truth for identity across the workspace shell.
      try {
        const profile = await apiFetch<CurrentUserProfile>('/userinfo')
        if (cancelled) return

        setUser({
          id: profile.profile_id,
          auth0_user_id: profile.auth0_user_id,
          auth0_org_id: profile.auth0_org_id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          user_status: profile.user_status,
          role: profile.role,
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
  }, [apiFetch])

  const login = useCallback(async (options?: { auth0OrgId?: string; invitation?: string }) => {
    // The backend is the OAuth client; a full-page redirect to /api/login starts
    // the server-side Authorization Code flow. Organization + invitation ride as
    // query params so the login is scoped to the correct tenant.
    const params = new URLSearchParams()
    if (options?.auth0OrgId) params.set('organization', options.auth0OrgId)
    if (options?.invitation) params.set('invitation', options.invitation)
    const qs = params.toString()
    window.location.href = `/api/login${qs ? `?${qs}` : ''}`
  }, [])

  const logout = useCallback(() => {
    // /api/logout clears the session cookie and ends the Auth0 session.
    window.location.href = '/api/logout'
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user: user || ({} as AuthUser), // Avoid spreading null into the context value before the first profile load completes
        organization: organization || ({} as AuthOrganization),
        isAuthenticated: status === 'authed',
        isLoading: status === 'loading',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// Role Helpers — access tiers (owner > admin > member > viewer).
const ROLE_HIERARCHY: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
}

export const useAuthRole = () => {
  const { user } = useAuth()

  const hasMinRole = (required: OrgRole) => {
    if (!user) return false
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[required]
  }

  return {
    hasMinRole,
    isOwner: user?.role === 'owner',
    isAdmin: hasMinRole('admin'),
    isMember: hasMinRole('member'),
  }
}

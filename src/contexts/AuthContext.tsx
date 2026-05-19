import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createSupabaseClient } from '../integrations/supabase/client'
import type { AppRole } from '../integrations/supabase/types'
import { AUTH0_AUDIENCE, AUTH0_CLAIM_NS } from '../lib/auth0-config'

// ── Public types ─────────────────────────────────────────────────────────────

export type UserRole = AppRole

export interface Organisation {
  id: string
  name: string
  logo_url?: string
  onboarding_completed: boolean
  settings: Record<string, unknown>
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  site: string
  avatar?: string
  organisation_id: string
}

interface AuthContextType {
  user: User | null
  organisation: Organisation | null
  isAuthenticated: boolean
  isLoading: boolean
  onboardingComplete: boolean
  /** Redirect to Auth0 Universal Login. Pass auth0OrgId on subdomain workspaces. */
  login: (auth0OrgId?: string) => void
  /** Clear local state and redirect to Auth0 logout endpoint. */
  logout: () => void
  /**
   * Re-fetch the organisation record from Supabase — call this after
   * onboarding writes `onboarding_completed = true` so the guard updates.
   */
  refreshOrganisation: () => Promise<void>
  /**
   * Return a fresh Auth0 access token.  Pass this as the Authorization
   * Bearer header when calling Supabase Edge Functions or any protected API.
   */
  getAccessToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchUserProfile(uid: string, accessToken: string): Promise<User | null> {
  const db = createSupabaseClient(accessToken)
  const { data, error } = await db.from('profiles').select('*').eq('id', uid).single()
  if (error || !data) return null
  return {
    id: data.id,
    name: data.full_name || data.email || '',
    email: data.email || '',
    role: (data.role ?? 'employee') as UserRole,
    department: data.department_id || '',
    site: data.profile_site_id || '',
    avatar: data.avatar_url || undefined,
    organisation_id: data.organisation_id ?? '',
  }
}

async function fetchOrganisation(orgId: string, accessToken: string): Promise<Organisation | null> {
  const db = createSupabaseClient(accessToken)
  const { data, error } = await db
    .from('organisations')
    .select('id, name, logo_url, onboarding_completed, settings')
    .eq('id', orgId)
    .single()
  if (error || !data) return null
  return {
    id: data.id,
    name: data.name,
    logo_url: data.logo_url ?? undefined,
    onboarding_completed: data.onboarding_completed ?? false,
    settings: (data.settings as Record<string, unknown>) ?? {},
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0()

  const [user, setUser] = useState<User | null>(null)
  const [organisation, setOrganisation] = useState<Organisation | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const getAccessToken = useCallback((): Promise<string> => {
    return getAccessTokenSilently({ authorizationParams: { audience: AUTH0_AUDIENCE } })
  }, [getAccessTokenSilently])

  const loadProfile = useCallback(
    async (auth0Sub: string, token: string) => {
      setProfileLoading(true)
      try {
        // Prefer custom claims injected by the Auth0 Post-Login Action (fast
        // path). Fall back to the Supabase profiles row (slow path).
        const claimedRole = auth0User?.[AUTH0_CLAIM_NS + 'role'] as AppRole | undefined
        const claimedOrgId = auth0User?.[AUTH0_CLAIM_NS + 'organisation_id'] as string | undefined

        const profile = await fetchUserProfile(auth0Sub, token)

        if (profile) {
          if (claimedRole) profile.role = claimedRole
          if (claimedOrgId) profile.organisation_id = claimedOrgId
          setUser(profile)
          if (profile.organisation_id) {
            const org = await fetchOrganisation(profile.organisation_id, token)
            setOrganisation(org)
          }
        } else {
          // Profile row not yet created (e.g. first login before a
          // post-registration webhook runs). Build minimal user from claims.
          setUser({
            id: auth0Sub,
            name: auth0User?.name || auth0User?.email || '',
            email: auth0User?.email || '',
            role: claimedRole ?? 'employee',
            department: '',
            site: '',
            avatar: auth0User?.picture ?? undefined,
            organisation_id: claimedOrgId ?? '',
          })
        }
      } finally {
        setProfileLoading(false)
      }
    },
    [auth0User]
  )

  useEffect(() => {
    if (!isAuthenticated || !auth0User?.sub) {
      // Use a microtask to avoid synchronous setState inside effect body
      Promise.resolve().then(() => {
        setUser(null)
        setOrganisation(null)
      })
      return
    }
    getAccessToken()
      .then((token) => loadProfile(auth0User.sub!, token))
      .catch(() => setProfileLoading(false))
  }, [isAuthenticated, auth0User?.sub, getAccessToken, loadProfile])

  const refreshOrganisation = useCallback(async () => {
    // Use full `user` object so the compiler can infer the dependency correctly
    if (!user?.organisation_id) return
    const token = await getAccessToken()
    const org = await fetchOrganisation(user.organisation_id, token)
    setOrganisation(org)
  }, [user, getAccessToken])

  const login = useCallback(
    (auth0OrgId?: string) => {
      loginWithRedirect({
        authorizationParams: auth0OrgId ? { organization: auth0OrgId } : undefined,
      })
    },
    [loginWithRedirect]
  )

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
    setUser(null)
    setOrganisation(null)
  }, [auth0Logout])

  const isLoading = auth0Loading || profileLoading
  const onboardingComplete = organisation?.onboarding_completed ?? false

  return (
    <AuthContext.Provider
      value={{
        user,
        organisation: organisation ?? {
          id: '',
          name: '',
          logo_url: undefined,
          onboarding_completed: false,
          settings: {},
        },
        isAuthenticated,
        isLoading,
        onboardingComplete,
        login,
        logout,
        refreshOrganisation,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

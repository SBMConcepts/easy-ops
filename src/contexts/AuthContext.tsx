import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../integrations/supabase/client'
import type { Session } from '@supabase/supabase-js'
import type { Database, AppRole } from '../integrations/supabase/types'

export type UserRole = AppRole

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type OrganisationRow = Database['public']['Tables']['organisations']['Row']

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
  organisation_id?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  organisation: Organisation
  isAuthenticated: boolean
  isLoading: boolean
  onboardingComplete: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, fullName: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshOrganisation: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchUserProfile(uid: string): Promise<User | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', uid)
    .single()
  if (error || !data) return null
  const p = data as ProfileRow
  return {
    id: p.id,
    name: p.full_name || p.email || '',
    email: p.email || '',
    role: (p.role ?? 'employee') as UserRole,
    department: p.department_id || '',
    site: p.profile_site_id || '',
    avatar: p.avatar_url || undefined,
    organisation_id: p.organisation_id || undefined,
  }
}

async function fetchOrganisation(orgId: string): Promise<Organisation | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('organisations') as any)
    .select('id, name, logo_url, onboarding_completed, settings')
    .eq('id', orgId)
    .single()
  if (error || !data) return null
  const row = data as Pick<
    OrganisationRow,
    'id' | 'name' | 'logo_url' | 'onboarding_completed' | 'settings'
  >
  return {
    id: row.id,
    name: row.name,
    logo_url: row.logo_url ?? undefined,
    onboarding_completed: row.onboarding_completed ?? false,
    settings: (row.settings as Record<string, unknown>) ?? {},
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [organisation, setOrganisation] = useState<Organisation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (uid: string) => {
    const profile = await fetchUserProfile(uid)
    setUser(profile)
    if (profile?.organisation_id) {
      const org = await fetchOrganisation(profile.organisation_id)
      setOrganisation(org)
    } else {
      setOrganisation(null)
    }
    setIsLoading(false)

    // ── Onboarding redirect gate ──────────────────────────────────────
    // After every login / session restore we check whether the admin
    // still needs to complete onboarding.  We only redirect when:
    //   1. The user is an admin
    //   2. Their organisation's onboarding_completed flag is false
    //   3. They are not already on the onboarding page (prevents an
    //      infinite redirect loop if navigate() fires more than once)
    //
    // Non-admin roles never go through onboarding; they land on /app
    // directly and ProtectedRoute handles role-based access from there.
  }, [])

  useEffect(() => {
    // onAuthStateChange fires for: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED,
    // USER_UPDATED, and PASSWORD_RECOVERY.  It is the single source of
    // truth for the session object after the initial getSession() call
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        // setTimeout(0) defers the Supabase DB calls so they don't run
        // inside the auth state-change callback itself.  Without this,
        // nested Supabase calls can deadlock the GoTrue client in some
        // versions of the JS SDK.
        setTimeout(() => loadProfile(session.user.id), 0)
      } else {
        setUser(null)
        setOrganisation(null)
        setIsLoading(false)
      }
    })

    // getSession() hydrates the session from localStorage on page load
    // without waiting for the onAuthStateChange event.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const refreshOrganisation = useCallback(async () => {
    // Called by the Onboarding page after it writes onboarding_completed=true
    // so that the context reflects the updated flag immediately, allowing
    // ProtectedRoute to let the admin through to /app.
    if (!session?.user) return
    await loadProfile(session.user.id)
  }, [session, loadProfile])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    // On success, onAuthStateChange fires SIGNED_IN → loadProfile runs →
    // redirect logic executes automatically. No manual navigate() here.
    return !error
  }, [])

  const signup = useCallback(
    async (email: string, password: string, fullName: string): Promise<boolean> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      })
      return !error
    },
    []
  )
  // Employees are never self-registering; they receive a Supabase invite email
  // triggered by the admin from the EmployeeManagement page (see notes below).
  // If you need a public sign-up flow in future, add it back here

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setOrganisation(null)
    // After sign-out, navigate to the marketing root rather than /login so
    // the user lands on the public-facing site, not an app page.
  }, [])

  const onboardingComplete = organisation?.onboarding_completed ?? false

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        organisation: organisation ?? {
          id: '',
          name: '',
          logo_url: '',
          onboarding_completed: false,
          settings: {},
        },
        isAuthenticated: !!session,
        isLoading,
        onboardingComplete,
        login,
        logout,
        refreshOrganisation,
        signup,
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

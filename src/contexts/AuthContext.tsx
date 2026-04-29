import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from 'react'
import { supabase } from '../integrations/supabase/client'
import type { Session } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'manager' | 'supervisor' | 'employee'

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
    organisation: Organisation | null
    isAuthenticated: boolean
    isLoading: boolean
    onboardingComplete: boolean
    login: (email: string, password: string) => Promise<boolean>
    signup: (
        email: string,
        password: string,
        fullName: string
    ) => Promise<boolean>
    logout: () => Promise<void>
    refreshOrganisation: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchUserProfile(uid: string): Promise<User | null> {
    const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('user_roles').select('role').eq('user_id', uid).single(),
    ])
    if (profileRes.error || !profileRes.data) return null
    const p = profileRes.data
    const role = (roleRes.data?.role as UserRole) ?? 'employee'
    return {
        id: p.id,
        name: p.full_name || p.email || '',
        email: p.email || '',
        role,
        department: p.department || '',
        site: p.site || '',
        avatar: p.avatar_url || undefined,
        organisation_id: p.organisation_id || undefined,
    }
}

async function fetchOrganisation(orgId: string): Promise<Organisation | null> {
    const { data, error } = await supabase
        .from('organisations')
        .select('id, name, logo_url, onboarding_completed, settings')
        .eq('id', orgId)
        .single()
    if (error || !data) return null
    return data as Organisation
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
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
    }, [])

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session)
            if (session?.user) {
                setTimeout(() => loadProfile(session.user.id), 0)
            } else {
                setUser(null)
                setOrganisation(null)
                setIsLoading(false)
            }
        })

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
        if (!session?.user) return
        await loadProfile(session.user.id)
    }, [session, loadProfile])

    const login = useCallback(
        async (email: string, password: string): Promise<boolean> => {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            return !error
        },
        []
    )

    const signup = useCallback(
        async (
            email: string,
            password: string,
            fullName: string
        ): Promise<boolean> => {
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

    const logout = useCallback(async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setOrganisation(null)
    }, [])

    const onboardingComplete = organisation?.onboarding_completed ?? false

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                organisation,
                isAuthenticated: !!session,
                isLoading,
                onboardingComplete,
                login,
                signup,
                logout,
                refreshOrganisation,
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

import { useAuth0 } from '@auth0/auth0-react'
import { useQuery } from '@tanstack/react-query'
import { useTenantApi } from './useTenantApi'

export interface EnrichedUser {
  profile_id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: 'admin' | 'manager' | 'employee' | 'supervisor' // Map this to your AppRole types
}

/**
 * Replaces `supabase.auth.getUser()`.
 * Automatically merges Auth0 session state with PostgreSQL profile data.
 */
export function useCurrentUser() {
  const { user: auth0User, isLoading: isAuth0Loading, isAuthenticated } = useAuth0()
  const { apiFetch } = useTenantApi()

  const {
    data: profile,
    isLoading: isProfileLoading,
    error,
  } = useQuery({
    queryKey: ['user-profile', auth0User?.sub],
    // Hits Express: GET /api/user/me
    queryFn: () => apiFetch<EnrichedUser>('user/me'),
    // Only run the DB fetch if Auth0 says we are definitely logged in
    enabled: isAuthenticated && !!auth0User?.sub,
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes to prevent spamming the API
  })

  return {
    // The raw Auth0 identity (good for immediate UI rendering like avatars)
    identity: auth0User,
    // The database profile (contains roles, permissions, internal UUIDs)
    profile,
    isLoading: isAuth0Loading || isProfileLoading,
    isAuthenticated,
    error,
  }
}

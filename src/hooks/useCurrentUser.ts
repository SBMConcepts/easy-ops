import { useAuth0 } from '@auth0/auth0-react'
import { useQuery } from '@tanstack/react-query'
import { useTenantApi } from './useTenantApi'

export interface EnrichedUser {
  profile_id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: 'admin' | 'manager' | 'employee' | 'supervisor'
}

/**
 * Automatically merges active Auth0 session state with PostgreSQL backend profile data.
 * Multi-tenant context is automatically resolved via the backend's token verification layer.
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
    // Only fetch from database if verified as authenticated by Auth0
    enabled: isAuthenticated && !!auth0User?.sub,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  return {
    auth0User,
    profile,
    role: profile?.role ?? null,
    isLoading: isAuth0Loading || isProfileLoading,
    isAuthenticated,
    error,
  }
}

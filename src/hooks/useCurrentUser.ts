import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from './useOrgApi'
import type { Permission } from '../lib/permissions'
import type { Database } from '../integrations/supabase/types'

type OrgRole = 'owner' | 'admin' | 'manager' | 'member'
type MembershipStatus = 'active' | 'suspended'

export interface LeaveBalance {
  id: string
  auth0_org_id: string
  auth0_user_id: string
  leave_type: string
  balance_days: number
}

export interface CurrentUserProfile {
  profile_id: string
  auth0_user_id: string
  auth0_org_id: string
  email: string
  full_name: string
  avatar_url: string | null
  status: string
  // Identity & contact (persisted on the users row)
  first_name: string
  last_name: string
  mobile_number: string
  national_id: string
  id_type: Database['public']['Enums']['identification_type'] | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null

  role: OrgRole
  permissions: Permission[]
  membership_status: MembershipStatus
  joined_at: string

  org_name: string
  org_auth0_id: string
  org_status: string
  org_logo: string | ''
  org_country: string | ''
  org_industry: string | ''

  plan: string | null
  billing_status: string | null
  current_period_end: string | null

  leave_balances: LeaveBalance[]

  address: string | null
}

export const currentUserKeys = {
  all: ['current-user'] as const,
  profile: (sub: string | undefined) => ['current-user', 'profile', sub] as const,
}

export function useCurrentUser() {
  const { isAuthenticated, user: authUser, isLoading: isAuthLoading } = useAuth()
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: currentUserKeys.profile(authUser?.id ?? undefined),
    queryFn: () => apiFetch<CurrentUserProfile>('/userinfo'),
    enabled: isAuthenticated && !!authUser?.id,

    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.startsWith('401')) return false
      return failureCount < 2
    },
  })

  const refetchProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: currentUserKeys.all })
  }

  const profile = query.data

  return {
    profile,

    role: profile?.role,
    membershipStatus: profile?.membership_status,
    isMembershipActive: profile?.membership_status === 'active',

    isLoading: isAuthLoading || query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    refetchProfile,
    isAuthenticated,
  }
}

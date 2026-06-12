import { useCallback } from 'react'
import { useTenantApi } from './useTenantApi'
import type { Database } from '../integrations/supabase/types'

export type AccessRequestRow = Database['public']['Tables']['access_requests']['Row']
export type TenantRole = Database['public']['Enums']['tenant_role']

export type ApproveAndInviteBody = {
  requestId: string
  email: string
  assignedRole?: TenantRole
}

export function useAccessRequestApi() {
  const { apiFetch } = useTenantApi()

  const listRequests = useCallback(async (): Promise<AccessRequestRow[]> => {
    const { requests } = await apiFetch<{ requests: AccessRequestRow[] }>('access-requests', {
      method: 'GET',
    })
    return requests
  }, [apiFetch])

  const approveAndInvite = useCallback(
    async (body: ApproveAndInviteBody) => {
      return apiFetch<{ success: true }>('access-requests/approve-and-invite', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    [apiFetch]
  )

  return { listRequests, approveAndInvite }
}

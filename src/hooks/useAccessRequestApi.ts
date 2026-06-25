import { useCallback } from 'react'
import { useOrgApi } from './useOrgApi'

// Local shapes — the access_requests table and tenant_role enum were removed in
// the v2 schema. This dropped feature's UI is retained but its endpoints are not
// implemented server-side (the calls will 404 at runtime).
export interface AccessRequestRow {
  id: string
  requester_name: string
  requester_email: string
  email_domain: string | null
  message: string | null
  status: string
  created_at: string
}
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer'

export type ApproveAndInviteBody = {
  requestId: string
  email: string
  assignedRole?: OrgRole
}

export function useAccessRequestApi() {
  const { apiFetch } = useOrgApi()

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

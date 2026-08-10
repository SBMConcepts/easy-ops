import { useCallback } from 'react'
import { useOrgApi } from './useOrgApi'

// Local shapes — the access_requests table and tenant_role enum were removed in
// the v2 schema. This dropped feature's UI is retained but its endpoints are not
// implemented server-side (the calls will 404 at runtime).
/** A pending access request row. Dropped in the v2 schema — kept for the retained UI, but the server endpoint 404s. */
export interface AccessRequestRow {
  id: string
  requester_name: string
  requester_email: string
  email_domain: string | null
  message: string | null
  status: string
  created_at: string
}
/** An org_members access tier. */
export type OrgRole = 'owner' | 'admin' | 'manager' | 'member'

/** Body for approving an access request and inviting the requester at a given role. */
export type ApproveAndInviteBody = {
  requestId: string
  email: string
  assignedRole?: OrgRole
}

/** Client for the (currently unimplemented) access-request review workflow. */
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

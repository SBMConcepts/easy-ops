import { useTenantApi } from './useTenantApi'

export type ApproveAndInviteBody = {
  requestId: string
  email: string
}

export function useAccessRequestApi() {
  const { apiFetch } = useTenantApi()

  const approveAndInvite = async (body: ApproveAndInviteBody) => {
    return apiFetch<{ ok: true }>('access-requests/approve-and-invite', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  return { approveAndInvite }
}

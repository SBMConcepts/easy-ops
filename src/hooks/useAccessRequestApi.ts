import { useCallback } from 'react'
import { useDB } from '../contexts/DatabaseContext'
import type { Database } from '../integrations/supabase/types'

export type AccessRequestRow = Database['public']['Tables']['access_requests']['Row']
export type TenantRole = Database['public']['Enums']['tenant_role']

export type ApproveAndInviteBody = {
  requestId: string
  email: string
  assignedRole?: TenantRole
}

export function useAccessRequestApi() {
  const supabase = useDB()

  // RLS restricts the result to access requests the caller is allowed to see
  // (manager/admin of the tenant). No server round-trip required.
  const listRequests = useCallback(async (): Promise<AccessRequestRow[]> => {
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [supabase])

  // Approval provisions a Supabase auth user + membership via a privileged
  // Edge Function (service-role). The caller's JWT is forwarded so the function
  // can verify they may approve before running the structural procedure.
  const approveAndInvite = useCallback(
    async (body: ApproveAndInviteBody) => {
      const { data, error } = await supabase.functions.invoke('access-request-approve', {
        body: {
          requestId: body.requestId,
          email: body.email,
          role: body.assignedRole ?? 'employee',
        },
      })
      if (error) throw error
      return data as { success: true }
    },
    [supabase]
  )

  return { listRequests, approveAndInvite }
}

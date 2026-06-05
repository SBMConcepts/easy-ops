/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useTenantApi } from '../hooks/useTenantApi'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import type { Database } from '../integrations/supabase/types'

type AccessRequestRow = Database['public']['Tables']['access_requests']['Row']

export default function EmployeeManagement(props: {
  requests: AccessRequestRow[]
  prefillEmailForRequest: (req: AccessRequestRow) => string
}) {
  const { requests, prefillEmailForRequest } = props
  const { apiFetch } = useTenantApi()
  const queryClient = useQueryClient()
  const [busyRequestIds, setBusyRequestIds] = useState<Record<string, boolean>>({})

  const onApprove = async (req: AccessRequestRow) => {
    if (req.status !== 'pending') return

    const ref = req.id
    const prefillEmail = prefillEmailForRequest(req)
    setBusyRequestIds((prev) => ({ ...prev, [ref]: true }))

    try {
      // Calls the Express backend which handles Auth0 user-provisioning and DB syncing
      await apiFetch('access-requests/approve-and-invite', {
        method: 'POST',
        body: JSON.stringify({ requestId: ref, email: prefillEmail, assignedRole: 'employee' }),
      })
      toast.success('Access approved and official invitation dispatched.')
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to approve request sequence.')
    } finally {
      setBusyRequestIds((prev) => ({ ...prev, [ref]: false }))
    }
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const disabled = req.status !== 'pending' || !!busyRequestIds[req.id]

        return (
          <div
            key={req.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-card"
          >
            <div className="flex-1">
              <div className="font-semibold text-sm">{req.requester_email}</div>
              <div className="text-xs text-muted-foreground capitalize">Status: {req.status}</div>
            </div>

            {req.status === 'pending' ? (
              <Button size="sm" onClick={() => onApprove(req)} disabled={disabled}>
                {busyRequestIds[req.id] ? 'Processing...' : 'Approve & Invite'}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground font-medium uppercase">
                {req.status}
              </span>
            )}
          </div>
        )
      })}

      {requests.length === 0 && (
        <div className="text-center text-sm text-muted-foreground p-6">
          No pending access requests.
        </div>
      )}
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import { useAccessRequestApi, type AccessRequestRow } from '../hooks/useAccessRequestApi'

export default function EmployeeManagement() {
  const { listRequests, approveAndInvite } = useAccessRequestApi()
  const queryClient = useQueryClient()
  const [busyRequestIds, setBusyRequestIds] = useState<Record<string, boolean>>({})

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
  } = useQuery<AccessRequestRow[]>({
    queryKey: ['access-requests'],
    queryFn: listRequests,
  })

  const onApprove = async (req: AccessRequestRow) => {
    if (req.status !== 'pending') return

    const ref = req.id
    setBusyRequestIds((prev) => ({ ...prev, [ref]: true }))

    try {
      // Calls the Express backend which handles Auth0 user-provisioning and DB syncing
      await approveAndInvite({
        requestId: ref,
        email: req.requester_email,
        assignedRole: 'member', // Default access tier for an approved employee; could be made selectable in the UI later
      })
      toast.success('Access approved and official invitation dispatched.')
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to approve request sequence.')
    } finally {
      setBusyRequestIds((prev) => ({ ...prev, [ref]: false }))
    }
  }

  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground p-6">Loading requests…</div>
  }

  if (isError) {
    return (
      <div className="text-center text-sm text-destructive p-6">
        {(error as Error)?.message ?? 'Failed to load access requests.'}
      </div>
    )
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

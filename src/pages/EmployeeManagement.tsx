import React, { useState } from 'react'
import { useAccessRequestApi } from '../hooks/useAccessRequestApi'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type AccessRequest = {
  id: string
  status: string
  requester_email: string
}

export default function EmployeeManagement(props: {
  requests: AccessRequest[]
  prefillEmailForRequest: (req: AccessRequest) => string
}) {
  const { requests, prefillEmailForRequest } = props

  const { approveAndInvite } = useAccessRequestApi()
  const queryClient = useQueryClient()

  const [busyRequestIds, setBusyRequestIds] = useState<Record<string, boolean>>({})

  const onApprove = async (req: AccessRequest) => {
    if (req.status !== 'pending') return

    const ref = req.id
    const prefillEmail = prefillEmailForRequest(req)

    setBusyRequestIds((prev) => ({ ...prev, [ref]: true }))
    try {
      await approveAndInvite({ requestId: ref, email: prefillEmail })

      toast.success('Access approved and invitation created.')

      // Optionally refresh list:
      // ...existing code...
      queryClient.invalidateQueries({ queryKey: ['workspace-employees'] })
      // ...existing code...    }
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Failed to approve.')
    } finally {
      setBusyRequestIds((prev) => ({ ...prev, [ref]: false }))
    }
  }

  return (
    <div>
      {requests.map((req) => {
        const disabled = req.status !== 'pending' || !!busyRequestIds[req.id]

        return (
          <div
            key={req.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{req.requester_email}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Status: {req.status}</div>
            </div>

            {req.status === 'pending' ? (
              <button onClick={() => onApprove(req)} disabled={disabled}>
                {disabled ? 'Approving…' : 'Approve & Invite'}
              </button>
            ) : (
              <span>—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { useAccessRequestApi } from '../hooks/useAccessRequestApi'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import type { AccessRequestRow } from '../integrations/supabase/types'

export default function EmployeeManagement(props: {
  requests: AccessRequestRow[]
  prefillEmailForRequest: (req: AccessRequestRow) => string
}) {
  const { requests, prefillEmailForRequest } = props

  const { approveAndInvite } = useAccessRequestApi()
  const queryClient = useQueryClient()

  const [busyRequestIds, setBusyRequestIds] = useState<Record<string, boolean>>({})

  const onApprove = async (req: AccessRequestRow) => {
    if (req.status !== 'pending') return

    const ref = req.id
    const prefillEmail = prefillEmailForRequest(req)

    setBusyRequestIds((prev) => ({ ...prev, [ref]: true }))
    try {
      await approveAndInvite({ requestId: ref, email: prefillEmail })
      toast.success('Access approved and invitation created.')
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Failed to approve.')
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
            className="flex items-center justify-between gap-4"
          >
            <div className="flex-1">
              <div className="font-semibold text-sm">{req.requester_email}</div>
              <div className="text-xs text-muted-foreground">Status: {req.status}</div>
            </div>

            {req.status === 'pending' ? (
              <Button size="sm" onClick={() => onApprove(req)} disabled={disabled}>
                {disabled ? 'Approving…' : 'Approve & Invite'}
              </Button>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
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

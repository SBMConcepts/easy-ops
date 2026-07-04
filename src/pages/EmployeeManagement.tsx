import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useOrgApi } from '../hooks/useOrgApi'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useAuthRole } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'

const ACCESS_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
type AccessRole = (typeof ACCESS_ROLES)[number]

interface MemberUser {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
}

interface MemberRow {
  id: string
  role: string
  status: string
  joined_at: string | null
  user_id: string | null
  users: MemberUser | null
}

export default function EmployeeManagement() {
  const { apiFetch } = useOrgApi()
  const { profile } = useCurrentUser()
  const { isAdmin, isOwner } = useAuthRole()
  const queryClient = useQueryClient()

  const canManage = isAdmin || isOwner
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)

  const {
    data: members = [],
    isLoading,
    isError,
    error,
  } = useQuery<MemberRow[]>({
    queryKey: ['org-members'],
    queryFn: async () => {
      const { members } = await apiFetch<{ members: MemberRow[] }>('org-members')
      return members
    },
  })

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AccessRole }) =>
      apiFetch('org-members', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
      toast.success('Member role updated')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    },
  })

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) =>
      apiFetch(`org-members/${membershipId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
      setRemoveTarget(null)
      toast.success('Member removed')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    },
  })

  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground p-6">Loading members…</div>
  }

  if (isError) {
    return (
      <div className="text-center text-sm text-destructive p-6">
        {(error as Error)?.message ?? 'Failed to load members.'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const displayName = member.users?.full_name || member.users?.email || 'Unknown user'
        const isCurrentUser = !!profile?.profile_id && member.user_id === profile.profile_id
        const canActOnMember = canManage && !isCurrentUser

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-card"
          >
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {displayName}
                {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
              </div>
              {member.users?.email && (
                <div className="text-xs text-muted-foreground">{member.users.email}</div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground capitalize">{member.status}</span>

              {canActOnMember && member.user_id ? (
                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    changeRole.mutate({ userId: member.user_id!, role: role as AccessRole })
                  }
                  disabled={changeRole.isPending}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium uppercase">{member.role}</span>
              )}

              {canActOnMember && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRemoveTarget(member)}
                  disabled={removeMember.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        )
      })}

      {members.length === 0 && (
        <div className="text-center text-sm text-muted-foreground p-6">No members found.</div>
      )}

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {removeTarget?.users?.full_name || removeTarget?.users?.email || 'this member'}
              </strong>{' '}
              from the organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeTarget && removeMember.mutate(removeTarget.id)}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

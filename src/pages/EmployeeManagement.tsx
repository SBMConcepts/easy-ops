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
import { Label } from '../components/ui/label'
import { useSites, useDepartments, useRoles } from '../hooks/useOrgData'

const ACCESS_ROLES = ['owner', 'admin', 'manager', 'member'] as const
type AccessRole = (typeof ACCESS_ROLES)[number]

// Sentinel for the "unassigned" option (Radix Select cannot use an empty value).
const NONE = '__none__'

interface MemberUser {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
}

interface MemberRow {
  id: string
  role: AccessRole
  status: string
  joined_at: string | null
  user_id: string | null
  department_id: string | null
  department_name: string | null
  site_id: string | null
  site_name: string | null
  job_role_id: string | null
  job_role_name: string | null
  users: MemberUser | null
}

export default function EmployeeManagement() {
  const { apiFetch } = useOrgApi()
  const { profile } = useCurrentUser()
  const { hasPermission } = useAuthRole()
  const queryClient = useQueryClient()

  const canChangeRole = hasPermission('write:org_members')
  const canRemove = hasPermission('delete:org_members')
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)
  const [assignTarget, setAssignTarget] = useState<MemberRow | null>(null)
  const [assignForm, setAssignForm] = useState({
    department_id: NONE,
    site_id: NONE,
    job_role_id: NONE,
  })

  const { data: sites = [] } = useSites()
  const { data: departments = [] } = useDepartments()
  const { data: roles = [] } = useRoles()

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

  const assignMember = useMutation({
    mutationFn: async (vars: {
      userId: string
      department_id: string | null
      site_id: string | null
      job_role_id: string | null
    }) =>
      apiFetch('org-members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: vars.userId,
          department_id: vars.department_id,
          site_id: vars.site_id,
          job_role_id: vars.job_role_id,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
      setAssignTarget(null)
      toast.success('Assignment updated')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update assignment')
    },
  })

  const openAssign = (member: MemberRow) => {
    setAssignForm({
      department_id: member.department_id ?? NONE,
      site_id: member.site_id ?? NONE,
      job_role_id: member.job_role_id ?? NONE,
    })
    setAssignTarget(member)
  }

  const submitAssign = () => {
    if (!assignTarget?.user_id) return
    assignMember.mutate({
      userId: assignTarget.user_id,
      department_id: assignForm.department_id === NONE ? null : assignForm.department_id,
      site_id: assignForm.site_id === NONE ? null : assignForm.site_id,
      job_role_id: assignForm.job_role_id === NONE ? null : assignForm.job_role_id,
    })
  }

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
        const canChangeMemberRole = canChangeRole && !isCurrentUser
        const canRemoveMember = canRemove && !isCurrentUser

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
              <div className="text-xs text-muted-foreground">
                {[member.job_role_name, member.department_name, member.site_name]
                  .filter(Boolean)
                  .join(' · ') || 'No department / site / title assigned'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground capitalize">{member.status}</span>

              {canChangeMemberRole && member.user_id ? (
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

              {canChangeMemberRole && member.user_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAssign(member)}
                  disabled={assignMember.isPending}
                >
                  Assign
                </Button>
              )}

              {canRemoveMember && (
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

      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign member</DialogTitle>
            <DialogDescription>
              Set the department, site and job title for{' '}
              <strong>
                {assignTarget?.users?.full_name || assignTarget?.users?.email || 'this member'}
              </strong>
              . These appear on their profile and are stamped onto their attendance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <Select
                value={assignForm.department_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, department_id: v ?? NONE }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Site</Label>
              <Select
                value={assignForm.site_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, site_id: v ?? NONE }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Job title</Label>
              <Select
                value={assignForm.job_role_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, job_role_id: v ?? NONE }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitAssign} disabled={assignMember.isPending}>
              {assignMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useOrgApi } from '../hooks/useOrgApi'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useAuthRole } from '../contexts/AuthContext'
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
import { Input } from '../components/ui/input'
import {
  useSites,
  useDepartments,
  useRoles,
  useShifts,
  useLeaveBalances,
  leaveKeys,
} from '../hooks/useOrgData'

import '../styles/employeemanagement.css'

const ACCESS_ROLES = ['owner', 'admin', 'manager', 'member'] as const
type AccessRole = (typeof ACCESS_ROLES)[number]

const EMPLOYMENT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'shift_worker', label: 'Shift Worker' },
] as const

const LEAVE_TYPES = [
  { key: 'annual', label: 'Annual Leave' },
  { key: 'sick', label: 'Sick Leave' },
  { key: 'family_responsibility', label: 'Family Responsibility' },
] as const

// Sentinel for the "unassigned" option (Radix Select cannot use an empty value).
const NONE = 'none'

interface MemberUser {
  id: string
  email: string
  full_name: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface MemberRow {
  id: string
  role: AccessRole
  status: string
  joined_at: string | null
  user_id: string | null
  first_name: string | null
  last_name: string | null
  department_id: string | null
  department_name: string | null
  site_id: string | null
  site_name: string | null
  job_role_id: string | null
  job_role_name: string | null
  employee_code: string | null
  employment_type: string | null
  shift_id: string | null
  shift_name: string | null
  manager_id: string | null
  manager_name: string | null
  users: MemberUser | null
}

export default function EmployeeManagement() {
  const { apiFetch } = useOrgApi()
  const { profile } = useCurrentUser()
  const { hasPermission } = useAuthRole()
  const queryClient = useQueryClient()

  const canChangeRole = hasPermission('write:org_members')
  const canRemove = hasPermission('delete:org_members')
  const canManageLeave = hasPermission('write:org_leave')
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)
  const [assignTarget, setAssignTarget] = useState<MemberRow | null>(null)
  const [assignForm, setAssignForm] = useState({
    department_id: NONE,
    site_id: NONE,
    job_role_id: NONE,
    shift_id: NONE,
    manager_id: NONE,
    first_name: '',
    last_name: '',

    employment_type: NONE,
    employee_code: '',
  })
  const [leaveForm, setLeaveForm] = useState<Record<string, string>>({
    annual: '0',
    sick: '0',
    family_responsibility: '0',
  })

  const { data: sites = [] } = useSites()
  const { data: departments = [] } = useDepartments()
  const { data: roles = [] } = useRoles()
  const { data: shifts = [] } = useShifts()
  const { data: leaveBalances } = useLeaveBalances(
    canManageLeave ? assignTarget?.user_id : undefined
  )

  // Sync the fetched leave balances into the editable form when they load.
  useEffect(() => {
    if (leaveBalances) {
      const next: Record<string, string> = { annual: '0', sick: '0', family_responsibility: '0' }
      for (const b of leaveBalances) next[b.leave_type] = String(b.balance_days)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLeaveForm(next)
    }
  }, [leaveBalances])

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
      first_name: string | null
      last_name: string | null
      department_id: string | null
      site_id: string | null
      job_role_id: string | null
      shift_id: string | null
      manager_id: string | null
      employment_type: string | null
      employee_code: string | null
    }) =>
      apiFetch('org-members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: vars.userId,
          first_name: vars.first_name,
          last_name: vars.last_name,
          department_id: vars.department_id,
          site_id: vars.site_id,
          job_role_id: vars.job_role_id,
          shift_id: vars.shift_id,
          manager_id: vars.manager_id,
          employment_type: vars.employment_type,
          employee_code: vars.employee_code,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update assignment')
    },
  })

  const saveLeave = useMutation({
    mutationFn: async (vars: {
      userId: string
      balances: Array<{ leave_type: string; balance_days: number }>
    }) =>
      apiFetch('org-leave', {
        method: 'PUT',
        body: JSON.stringify({ user_id: vars.userId, balances: vars.balances }),
      }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update leave balances')
    },
  })

  const openAssign = (member: MemberRow) => {
    setAssignForm({
      department_id: member.department_id ?? NONE,
      site_id: member.site_id ?? NONE,
      first_name: member.first_name ?? '',
      last_name: member.last_name ?? '',
      job_role_id: member.job_role_id ?? NONE,
      shift_id: member.shift_id ?? NONE,
      manager_id: member.manager_id ?? NONE,
      employment_type: member.employment_type ?? NONE,
      employee_code: member.employee_code ?? '',
    })
    setLeaveForm({ annual: '0', sick: '0', family_responsibility: '0' })
    setAssignTarget(member)
  }

  const submitAssign = async () => {
    if (!assignTarget?.user_id) return
    const userId = assignTarget.user_id
    try {
      await assignMember.mutateAsync({
        userId,
        department_id: assignForm.department_id === NONE ? null : assignForm.department_id,
        site_id: assignForm.site_id === NONE ? null : assignForm.site_id,
        job_role_id: assignForm.job_role_id === NONE ? null : assignForm.job_role_id,
        shift_id: assignForm.shift_id === NONE ? null : assignForm.shift_id,
        manager_id: assignForm.manager_id === NONE ? null : assignForm.manager_id,
        employment_type: assignForm.employment_type === NONE ? null : assignForm.employment_type,
        first_name: assignForm.first_name,
        last_name: assignForm.last_name,
        employee_code:
          assignForm.employee_code.trim() === '' ? null : assignForm.employee_code.trim(),
      })
      if (canManageLeave) {
        await saveLeave.mutateAsync({
          userId,
          balances: LEAVE_TYPES.map((t) => ({
            leave_type: t.key,
            balance_days: Number(leaveForm[t.key]) || 0,
          })),
        })
        queryClient.invalidateQueries({ queryKey: leaveKeys.member(userId) })
      }
      setAssignTarget(null)
      toast.success('Member updated')
    } catch {
      // Errors surfaced via the individual mutation onError handlers.
    }
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
    <div className="employee-management-page">
      {members.map((member) => {
        const displayName =
          member.users?.first_name && member.users?.last_name
            ? `${member.users.first_name} ${member.users.last_name}`
            : member.users?.first_name || 'Unknown user'
        const isCurrentUser = !!profile?.profile_id && member.user_id === profile.profile_id
        const canChangeMemberRole = canChangeRole && !isCurrentUser
        const canRemoveMember = canRemove && !isCurrentUser

        return (
          <div key={member.id} className="employee-management-row">
            <div className="employee-management-info">
              <div className="employee-management-name">
                {displayName}
                {isCurrentUser && <span className="employee-management-you">(You)</span>}
              </div>
              {member.users?.email && (
                <div className="employee-management-email">{member.users.email}</div>
              )}
              <div className="employee-management-meta">
                {[member.job_role_name, member.department_name, member.site_name]
                  .filter(Boolean)
                  .join(' · ') || 'No department / site / title assigned'}
              </div>
            </div>

            <div className="employee-management-actions">
              <span className="employee-management-status">{member.status}</span>

              {canChangeMemberRole && member.user_id ? (
                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    changeRole.mutate({ userId: member.user_id!, role: role as AccessRole })
                  }
                  disabled={changeRole.isPending}
                >
                  <SelectTrigger className="employee-management-role-select-trigger">
                    <SelectValue className="employee-management-select-value" />
                  </SelectTrigger>
                  <SelectContent className="employee-management-role-select-content">
                    {ACCESS_ROLES.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        className="employee-management-role-select-item"
                      >
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="employee-management-role">{member.role}</span>
              )}

              {canChangeMemberRole && member.user_id && (
                <button
                  className="employee-management-assign-button"
                  onClick={() => openAssign(member)}
                  disabled={assignMember.isPending}
                >
                  Assign
                </button>
              )}

              {canRemoveMember && (
                <button
                  className="employee-management-remove-button"
                  onClick={() => setRemoveTarget(member)}
                  disabled={removeMember.isPending}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )
      })}

      {members.length === 0 && (
        <div className="employee-management-no-members">No members found.</div>
      )}

      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign member</DialogTitle>
            <DialogDescription>
              Set the employment details for{' '}
              <strong>
                {assignTarget?.users?.full_name || assignTarget?.users?.email || 'this member'}
              </strong>
              . These appear on their profile and are stamped onto their attendance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              <Label className="employee-management-label">Employee / Payroll Code</Label>
              <Input
                value={assignForm.employee_code}
                onChange={(e) => setAssignForm((f) => ({ ...f, employee_code: e.target.value }))}
                placeholder="e.g. EMP-00123"
              />
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Department</Label>
              <Select
                value={assignForm.department_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, department_id: v ?? NONE }))}
              >
                <SelectTrigger className="employee-management-select-trigger">
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
              <Label className="employee-management-label">Site</Label>
              <Select
                value={assignForm.site_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, site_id: v ?? NONE }))}
              >
                <SelectTrigger className="employee-management-select-trigger">
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
              <Label className="employee-management-label">Job title</Label>
              <Select
                value={assignForm.job_role_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, job_role_id: v ?? NONE }))}
              >
                <SelectTrigger className="employee-management-select-trigger">
                  <SelectValue
                    className="employee-management-select-value"
                    placeholder="Select a job title"
                  />
                </SelectTrigger>
                <SelectContent className="employee-management-select-content">
                  <SelectItem className="employee-management-select-item" value={NONE}>
                    Unassigned
                  </SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} className="employee-management-select-item" value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Direct manager / supervisor</Label>
              <Select
                value={assignForm.manager_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, manager_id: v ?? NONE }))}
              >
                <SelectTrigger className="employee-management-select-trigger">
                  <SelectValue
                    className="employee-management-select-value"
                    placeholder="Select a manager"
                  />
                </SelectTrigger>
                <SelectContent className="employee-management-select-content">
                  <SelectItem className="employee-management-select-item" value={NONE}>
                    Unassigned
                  </SelectItem>
                  {members
                    .filter((m) => m.id !== assignTarget?.id)
                    .map((m) => (
                      <SelectItem
                        key={m.id}
                        className="employee-management-select-item"
                        value={m.id}
                      >
                        {m.users?.full_name || m.users?.email || 'Unknown'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Employment type</Label>
              <Select
                value={assignForm.employment_type}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, employment_type: v ?? NONE }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Shift schedule</Label>
              <Select
                value={assignForm.shift_id}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, shift_id: v ?? NONE }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManageLeave && (
              <div className="space-y-2 border-t pt-3">
                <Label className="employee-management-label">Leave balances (days)</Label>
                {LEAVE_TYPES.map((t) => (
                  <div key={t.key} className="space-y-1">
                    <Label className="employee-management-label">{t.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={leaveForm[t.key]}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, [t.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <button className="employee-management-button" onClick={() => setAssignTarget(null)}>
              Cancel
            </button>
            <button
              className="employee-management-button"
              onClick={submitAssign}
              disabled={assignMember.isPending || saveLeave.isPending}
            >
              {assignMember.isPending || saveLeave.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save'
              )}
            </button>
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
            <button className="employee-management-button" onClick={() => setRemoveTarget(null)}>
              Cancel
            </button>
            <button
              className="employee-management-button employee-management-remove-button"
              onClick={() => removeTarget && removeMember.mutate(removeTarget.id)}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

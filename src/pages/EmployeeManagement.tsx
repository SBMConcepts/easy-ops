import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useOrgApi } from '../hooks/useOrgApi'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { OrgRole, useAuthRole } from '../contexts/AuthContext'
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

interface MemberUserRef {
  id: string
  auth0_org_id: string
  auth0_user_id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
  department_id: string
  department_name: string
  manager_id: string
  manager_name: string
  employment_type: string
  employee_code: string
  site_id: string
  site_name: string
  job_role_id: string
  job_role_name: string
  shift_id: string
  shift_name: string
  hourly_rate: number
  tax_number: string
  role: OrgRole
  status: string
}

interface MemberRow {
  id: string
  auth0_org_id: string
  auth0_user_id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
  department_id: string
  department_name: string
  manager_id: string
  manager_name: string
  employment_type: string
  employee_code: string
  site_id: string
  site_name: string
  job_role_id: string
  job_role_name: string
  shift_id: string
  shift_name: string
  hourly_rate: number
  tax_number: string
  role: OrgRole
  status: string
}

export default function EmployeeManagement() {
  const { apiFetch } = useOrgApi()
  const { profile } = useCurrentUser()
  const { hasPermission } = useAuthRole()
  const queryClient = useQueryClient()

  const canChangeRole = hasPermission('write:org_members')
  const canRemove = hasPermission('delete:org_members')
  const canManageLeave = hasPermission('write:org_leave')
  const [removeTarget, setRemoveTarget] = useState<MemberRow>()
  const [assignTarget, setAssignTarget] = useState<MemberRow>()
  const [assignForm, setAssignForm] = useState({
    id: '',
    auth0_org_id: '',
    auth0_user_id: '',
    full_name: '',
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    department_name: '',
    site_id: '',
    site_name: '',
    job_role_id: '',
    job_role_name: '',
    employee_code: '',
    employment_type: '',
    manager_id: '',
    manager_name: '',
    shift_id: '',
    shift_name: '',
    hourly_rate: 0,
    tax_number: '',
    role: 'member' as OrgRole,
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
    canManageLeave ? assignTarget?.auth0_user_id : undefined
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
    mutationFn: async ({ auth0_user_id, role }: { auth0_user_id: string; role: AccessRole }) =>
      apiFetch('org-members', {
        method: 'POST',
        body: JSON.stringify({ auth0_user_id: auth0_user_id, role }),
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
    mutationFn: async (id: string) => apiFetch(`org-members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
      setRemoveTarget((prev) => (prev ? { ...prev, status: 'removed' } : prev))
      toast.success('Member removed')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    },
  })

  const assignMember = useMutation({
    mutationFn: async (vars: {
      id: string
      auth0_user_id: string
      auth0_org_id: string
      full_name: string
      first_name: string
      last_name: string
      email: string
      department_id: string
      department_name: string
      manager_id: string
      manager_name: string
      employment_type: string
      employee_code: string
      site_id: string
      site_name: string
      job_role_id: string
      job_role_name: string
      shift_id: string
      shift_name: string
      hourly_rate: number
      tax_number: string
      role: OrgRole
    }) =>
      apiFetch('org-members', {
        method: 'POST',
        body: JSON.stringify(vars),
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
      id: string
      balances_days: Array<{ leave_type: string; balance_days: number }>
    }) =>
      apiFetch('org-leave', {
        method: 'PUT',
        body: JSON.stringify({ user_id: vars.id, balances: vars.balances_days }),
      }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update leave balances')
    },
  })

  const openAssign = (member: MemberRow) => {
    setAssignForm({
      id: member.id,
      auth0_org_id: member.auth0_org_id,
      auth0_user_id: member.auth0_user_id ?? '',
      full_name: member.full_name ?? '',
      first_name: member.first_name ?? '',
      last_name: member.last_name ?? '',
      email: member.email ?? '',
      department_id: member.department_id ?? '',
      department_name: member.department_name ?? '',
      manager_id: member.manager_id ?? '',
      manager_name: member.manager_name ?? '',
      employment_type: member.employment_type ?? '',
      employee_code: member.employee_code ?? '',
      site_id: member.site_id ?? '',
      site_name: member.site_name ?? '',
      job_role_id: member.job_role_id ?? '',
      job_role_name: member.job_role_name ?? '',
      shift_id: member.shift_id ?? '',
      shift_name: member.shift_name ?? '',
      hourly_rate: member.hourly_rate ?? 0,
      tax_number: member.tax_number ?? '',
      role: member.role ?? 'member',
    })
    setLeaveForm({ annual: '0', sick: '0', family_responsibility: '0' })
    setAssignTarget(member)
  }

  const submitAssign = async () => {
    const user_id = assignTarget?.auth0_user_id
    if (!user_id) return
    const toNull = (v: string) => (v === '' || v === NONE ? null : v)
    try {
      await assignMember.mutateAsync({
        id: assignForm.id,
        auth0_org_id: assignForm.auth0_org_id,
        auth0_user_id: assignForm.auth0_user_id,
        full_name: assignForm.full_name,
        first_name: assignForm.first_name,
        last_name: assignForm.last_name,
        email: assignForm.email,
        department_id: assignForm.department_id,
        department_name: assignForm.department_name,
        site_id: assignForm.site_id,
        site_name: assignForm.site_name,
        job_role_id: assignForm.job_role_id,
        job_role_name: assignForm.job_role_name,
        employee_code: assignForm.employee_code,
        manager_id: assignForm.manager_id,
        manager_name: assignForm.manager_name,
        employment_type: assignForm.employment_type,
        shift_id: assignForm.shift_id,
        shift_name: assignForm.shift_name,
        hourly_rate: assignForm.hourly_rate,
        tax_number: assignForm.tax_number,
        role: assignForm.role,
      })
      if (canManageLeave) {
        await saveLeave.mutateAsync({
          id: user_id,
          balances_days: LEAVE_TYPES.map((t) => ({
            leave_type: t.key,
            balance_days: Number(leaveForm[t.key]) || 0,
          })),
        })
        const sub = assignTarget?.auth0_user_id
        if (sub) queryClient.invalidateQueries({ queryKey: leaveKeys.member(sub) })
      }
      setAssignTarget(assignTarget)
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
      <div className="employee-management-header">
        <h1 className="employee-management-header__title">Staff Directory</h1>
        <p className="employee-management-header__subtitle">Manage your team members</p>
        <p className="employee-management-header__description">
          View everyone in your organization, edit their role and employment details, or remove
          members who have left.
        </p>
      </div>

      {members.map((member) => {
        const displayName = member.full_name
        const isCurrentUser = profile?.auth0_user_id === member.auth0_user_id
        const canChangeMemberRole = canChangeRole && !isCurrentUser
        const canRemoveMember = canRemove && !isCurrentUser

        return (
          <div key={member.id} className="employee-management-row">
            <div className="employee-management-info">
              <div className="employee-management-name">
                {displayName}
                {isCurrentUser && <span className="employee-management-you">(You)</span>}
              </div>
              {member.email && <div className="employee-management-email">{member.email}</div>}
              <div className="employee-management-meta">
                {[member.job_role_name, member.department_name, member.site_name]
                  .filter(Boolean)
                  .join(' · ') || 'No department / site / title assigned'}
              </div>
            </div>

            <div className="employee-management-actions">
              <span className="employee-management-status">{member.status}</span>

              {canChangeMemberRole && member.auth0_user_id ? (
                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    changeRole.mutate({
                      auth0_user_id: member.auth0_user_id!,
                      role: role as OrgRole,
                    })
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

              {canChangeMemberRole && member.auth0_user_id && (
                <button
                  className="employee-management-assign-button"
                  onClick={() => openAssign(member)}
                  disabled={assignMember.isPending}
                >
                  Edit
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

      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>
              Set the employment details for{' '}
              <strong>{assignTarget?.full_name || assignTarget?.email || 'this member'}</strong>.
              These appear on their profile and are stamped onto their attendance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              <Label className="employee-management-label">Employee / Payroll Code</Label>
              <Input
                value={assignForm.employee_code}
                onChange={(e) => setAssignForm((f) => ({ ...f, employee_code: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Department</Label>
              <Select
                value={assignForm.department_id || NONE}
                onValueChange={(v) =>
                  setAssignForm((f) => ({ ...f, department_id: v && v !== NONE ? v : '' }))
                }
              >
                <SelectTrigger className="employee-management-select-trigger">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Site</Label>
              <Select
                value={assignForm.site_name}
                onValueChange={(v) =>
                  setAssignForm((f) => ({ ...f, site_name: v && v !== NONE ? v : '' }))
                }
              >
                <SelectTrigger className="employee-management-select-trigger">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.site_name}>
                      {s.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Job title</Label>
              <Select
                value={assignForm.job_role_name}
                onValueChange={(v) =>
                  setAssignForm((f) => ({ ...f, job_role_name: v && v !== NONE ? v : '' }))
                }
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
                    <SelectItem
                      key={r.id}
                      className="employee-management-select-item"
                      value={r.name}
                    >
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Direct manager / supervisor</Label>
              <Select
                value={assignForm.manager_name}
                onValueChange={(v) =>
                  setAssignForm((f) => ({ ...f, manager_name: v && v !== NONE ? v : '' }))
                }
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
                        value={m?.full_name || m?.email}
                      >
                        {m?.full_name || m?.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="employee-management-label">Employment type</Label>
              <Select
                value={assignForm.employment_type || NONE}
                onValueChange={(v) =>
                  setAssignForm((f) => ({ ...f, employment_type: v && v !== NONE ? v : '' }))
                }
              >
                <SelectTrigger className="employee-management-select-trigger">
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
                key={assignForm.shift_id}
                value={assignForm.shift_name}
                onValueChange={(v) =>
                  setAssignForm((f) => ({ ...f, shift_name: v && v !== NONE ? v : '' }))
                }
              >
                <SelectTrigger className="employee-management-select-trigger">
                  <SelectValue placeholder="Select a shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.shift_name}>
                      {s.shift_name}
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
            <button
              className="employee-management-button"
              onClick={() => setAssignTarget(assignTarget)}
            >
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

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <strong>{removeTarget?.full_name || removeTarget?.email}</strong> from the
              organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="employee-management-button"
              onClick={() => setRemoveTarget(removeTarget)}
            >
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

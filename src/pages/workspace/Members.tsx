/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrgApi } from '../../hooks/useOrgApi'
import { Input } from '../../components/ui/input'
import { toast } from 'sonner'
import { Loader2, Users, Mail, UserPlus, Shield, Trash2 } from 'lucide-react'
import '../../styles/settings.css'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'

// Define the shape of a member
interface Member {
  id: string
  email: string
  full_name: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'invited'
}

export default function WorkspaceMembers() {
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')

  // Fetch Team Members
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['workspace-members'],
    queryFn: () => apiFetch('users'), // Assuming this returns users in the current org
  })

  // Invite Member Mutation
  const inviteMember = useMutation({
    mutationFn: async () => {
      return apiFetch('invitations', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send invitation'),
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return toast.error('Email is required')
    inviteMember.mutate()
  }

  return (
    <div className="settings-page">
      <div className="flex items-center gap-3 mb-2">
        <div className="settings-header">
          <h1 className="settings-header__title">Team Members</h1>
          <p className="settings-header__subtitle">
            Manage who has access to this workspace and their permissions.
          </p>
        </div>
      </div>

      {/* Invite Section */}
      <div className="settings-card-tab">
        <div className="settings-card-tab__header">
          <h2 className="settings-card-tab__title">Invite New Member</h2>
        </div>

        <div className="settings-card-tab__content">
          <form onSubmit={handleInvite} className="settings-card-tab__form-grid">
            <div className="settings-card-tab__row ">
              <Label className="settings-card-tab__label">Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                className="settings-card-tab__input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label">Role</Label>
              <Select
                value={inviteRole || ''}
                onValueChange={(value) => setInviteRole(value as 'admin' | 'member' | 'viewer')}
              >
                <SelectTrigger className="settings-card-tab__select-trigger">
                  <SelectValue
                    className="settings-card-tab__select-value"
                    placeholder="Select a role"
                  />
                </SelectTrigger>
                <SelectContent className="settings-card-tab__select-content">
                  <SelectItem className="settings-card-tab__select-item" value="admin">
                    Admin
                  </SelectItem>
                  <SelectItem className="settings-card-tab__select-item" value="member">
                    Member
                  </SelectItem>
                  <SelectItem className="settings-card-tab__select-item" value="viewer">
                    Viewer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          <div className="settings-card-tab__footer">
            <button
              type="submit"
              disabled={inviteMember.isPending}
              className="settings-card-tab__save-btn"
              onClick={handleInvite}
            >
              {inviteMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send Invite
            </button>
          </div>
        </div>
      </div>

      {/* Member List */}
      <div className="settings-tabs__content">
        <div className="settings-card-tab">
          <Table className="settings-card-tab__table">
            <TableHeader className="settings-card-tab__table-header">
              <TableRow className=" settings-card-tab__table-row">
                <TableCell className="settings-card-tab__table-cell">User</TableCell>
                <TableCell className="settings-card-tab__table-cell">Role</TableCell>
                <TableCell className="settings-card-tab__table-cell">Status</TableCell>
                <TableCell className="settings-card-tab__table-cell text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="settings-card-tab__table-body">
              {isLoading ? (
                <TableRow className="settings-card-tab__table-row">
                  <TableCell
                    colSpan={4}
                    className="settings-card-tab__table-cell text-center text-muted-foreground"
                  >
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow className="settings-card-tab__table-row">
                  <TableCell
                    colSpan={4}
                    className="settings-card-tab__table-cell text-center text-muted-foreground"
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} className="settings-card-tab__table-row">
                    <TableCell className="settings-card-tab__table-cell">
                      <div className="font-medium">{member.full_name || 'Pending User'}</div>
                      <div className="settings-card-tab__table-cell text-muted-foreground">
                        {member.email}
                      </div>
                    </TableCell>
                    <TableCell className="settings-card-tab__table-cell">
                      <div className="flex items-center gap-1">
                        {member.role === 'owner' || member.role === 'admin' ? (
                          <Shield className="h-3 w-3 text-blue-500" />
                        ) : null}
                        <span className="capitalize">{member.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="settings-card-tab__table-cell">
                      <span
                        className={`settings-card-tab__table-cell ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {member.status}
                      </span>
                    </TableCell>
                    <TableCell className="settings-card-tab__table-cell text-right">
                      {member.role !== 'owner' && (
                        <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

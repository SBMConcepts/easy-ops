/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrgApi } from '../../hooks/useOrgApi'
import { Input } from '../../components/ui/input'
import { toast } from 'sonner'
import { Loader2, Users, Mail, UserPlus, Shield, Trash2 } from 'lucide-react'

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
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-muted-foreground text-sm">
            Manage who has access to this workspace and their permissions.
          </p>
        </div>
      </div>

      {/* Invite Section */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Invite New Member
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="w-full sm:w-1/2 space-y-1">
            <label className="text-xs font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="colleague@company.com"
                className="pl-9"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-1/4 space-y-1">
            <label className="text-xs font-medium">Role</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviteMember.isPending}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 w-full sm:w-auto disabled:opacity-50"
          >
            {inviteMember.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Send Invite
          </button>
        </form>
      </div>

      {/* Member List */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-t">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">
                        {member.full_name || 'Pending User'}
                      </div>
                      <div className="text-muted-foreground">{member.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {member.role === 'owner' || member.role === 'admin' ? (
                          <Shield className="h-3 w-3 text-blue-500" />
                        ) : null}
                        <span className="capitalize">{member.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.role !== 'owner' && (
                        <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

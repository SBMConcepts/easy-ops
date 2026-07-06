/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useOrgApi } from '../../hooks/useOrgApi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'
import { toast } from 'sonner'
import { UserPlus, Loader2 } from 'lucide-react'

export type AppRole = 'owner' | 'admin' | 'manager' | 'member'

export interface NewEmployee {
  id?: string
  full_name: string
  email: string
  role: AppRole
  department: string | null
  site: string | null
}

interface NamedRow {
  id: string
  name: string
}

interface InviteResponse {
  success: boolean
  invitationId?: string
  userId?: string
}

interface Props {
  onInvited?: (employee: NewEmployee) => void
}

export const InviteEmployeeDialog = ({ onInvited }: Props) => {
  const { apiFetch } = useOrgApi() // Leverage your new secure API bridge
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AppRole>('member')
  const [departmentId, setDepartmentId] = useState('')
  const [siteId, setSiteId] = useState('')

  // Load the tenant's sites and departments so the invite carries real UUIDs
  // (the backend expects departmentId/siteId, not free-text names).
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiFetch<NamedRow[]>('org-sites'),
    enabled: open,
  })
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiFetch<NamedRow[]>('org-departments'),
    enabled: open,
  })

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setRole('member')
    setDepartmentId('')
    setSiteId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) {
      return toast.error('Email and Full Name are required.')
    }

    setLoading(true)
    try {
      const result = await apiFetch<InviteResponse>('invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role,
          departmentId: departmentId || null,
          siteId: siteId || null,
        }),
      })

      toast.success(`Invitation successfully dispatched to ${email}`)

      queryClient.invalidateQueries({ queryKey: ['workspace-employees'] })

      if (onInvited && result?.success) {
        onInvited({
          id: result.userId,
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          department: departments.find((d) => d.id === departmentId)?.name ?? null,
          site: sites.find((s) => s.id === siteId)?.name ?? null,
        })
      }

      resetForm()
      setOpen(false)
    } catch (err: any) {
      console.error('Invite error:', err)
      toast.error(err.message || 'Failed to dispatch invitation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="bg-primary text-primary-foreground">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25 bg-zinc-950 text-zinc-50 border border-zinc-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Send an email invitation allowing a new member to join this company workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <ModalField label="Full Name *">
            <ModalInput
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
            />
          </ModalField>

          <ModalField label="Email Address *">
            <ModalInput
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </ModalField>

          <div className="grid grid-cols-2 gap-4">
            <ModalField label="System Role *">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 transition-colors"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </ModalField>

            <ModalField label="Department">
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 transition-colors"
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </ModalField>
          </div>

          <ModalField label="Default Site">
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 transition-colors"
            >
              <option value="">Unassigned</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </ModalField>

          <div className="flex gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setOpen(false)
              }}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center py-2.5 text-sm font-semibold bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dispatching…
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function ModalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg focus:ring-secondary focus:border-secondary block w-full p-2.5 transition-colors placeholder-zinc-600 outline-none"
    />
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { supabase } from '../../integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
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

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'employee'

export interface NewEmployee {
  id?: string
  full_name: string
  email: string
  role: AppRole
  department: string | null
  site: string | null
}

interface Props {
  onInvited?: (employee: NewEmployee) => void
}

export const InviteEmployeeDialog = ({ onInvited }: Props) => {
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AppRole>('employee')
  const [department, setDepartment] = useState('')
  const [site, setSite] = useState('')

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setRole('employee')
    setDepartment('')
    setSite('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) {
      return toast.error('Email and Full Name are required.')
    }

    setLoading(true)
    try {
      // Privileged invite Edge Function: creates the Supabase auth user (emails a
      // set-password link) and an 'invited' membership in the caller's tenant.
      // The handle_new_user() trigger activates the membership on first sign-in.
      const { error } = await supabase.functions.invoke('tenant-invite-member', {
        body: {
          email: email.trim(),
          fullName: fullName.trim(),
          role,
        },
      })

      if (error) throw error

      toast.success(`Invitation successfully dispatched to ${email}`)

      // Auto-refresh the employee table behind the modal
      queryClient.invalidateQueries({ queryKey: ['workspace-employees'] })

      if (onInvited) {
        onInvited({
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          department: department.trim() || null,
          site: site.trim() || null,
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
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </ModalField>

            <ModalField label="Department">
              <ModalInput
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Operations"
              />
            </ModalField>
          </div>

          <ModalField label="Default Site">
            <ModalInput
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. Main Factory"
            />
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

/* ── Auxiliary Sub-Components ────────────────────────────────────────────── */

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

import { useState } from 'react'
import { createSupabaseClient } from '../../integrations/supabase/client'
import { useAuth } from '../../contexts/AuthContext'
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
import { UserPlus } from 'lucide-react'

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'employee'

export interface NewEmployee {
  id: string
  full_name: string
  email: string
  custom_role: string | null
  role: AppRole
  department: string | null
  site: string | null
}

interface Props {
  onInvited?: (employee: NewEmployee) => void
}

export const InviteEmployeeDialog = ({ onInvited }: Props) => {
  const { user, getAccessToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [role, setRole] = useState<AppRole>('employee')
  const [department, setDepartment] = useState('')
  const [site, setSite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const reset = () => {
    setFullName('')
    setEmail('')
    setCustomRole('')
    setRole('employee')
    setDepartment('')
    setSite('')
    setError(null)
    setInviteSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInviteSuccess(null)

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.')
      return
    }

    setLoading(true)
    const token = await getAccessToken()
    const db = createSupabaseClient(token)
    const { data, error: fnError } = await db.functions.invoke('invite-employee', {
      body: {
        full_name: fullName.trim(),
        email: email.trim(),
        custom_role: customRole.trim() || null,
        role,
        organisation_id: user?.organisation_id,
        department: department || undefined,
        site: site || undefined,
      },
      headers: { Authorization: `Bearer ${token}` },
    })
    setLoading(false)

    if (fnError || data?.error) {
      const msg = data?.error || fnError?.message || 'Failed to invite employee'
      setError(msg)
      return
    }

    const newEmployee: NewEmployee = {
      id: data?.user_id ?? '',
      full_name: fullName.trim(),
      email: email.trim(),
      custom_role: customRole.trim() || null,
      role,
      department: department || null,
      site: site || null,
    }

    setInviteSuccess(
      `Invite sent to ${email.trim()}. They'll receive an email to set their password and log in.`
    )
    onInvited?.(newEmployee)
    toast.success(`Invitation sent to ${email.trim()}`)
    setFullName('')
    setEmail('')
    setRole('employee')
    setDepartment('')
    setSite('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        }
      />
      <DialogContent className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl max-w-md gap-0">
        <DialogHeader className="mb-5">
          <DialogTitle className="text-base font-semibold text-zinc-100">
            Invite a team member
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 mt-0.5">
            They'll receive an email to verify and set their password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ModalField label="Full name">
            <ModalInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Thabo Mokoena"
              autoFocus
            />
          </ModalField>

          <ModalField label="Work email">
            <ModalInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.co.za"
            />
          </ModalField>
          <ModalField label="Custom role (optional)">
            <ModalInput
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="e.g. Team Lead (will be added as a tag)"
            />
          </ModalField>

          <ModalField label="Role at the company">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="employee">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="admin">Employee</option>
            </select>
          </ModalField>

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Department (optional)">
              <ModalInput
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Finance"
              />
            </ModalField>
            <ModalField label="Site (optional)">
              <ModalInput
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Cape Town"
              />
            </ModalField>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          {inviteSuccess && (
            <p className="text-sm text-green-400 bg-green-950/40 border border-green-800 rounded-lg px-4 py-2.5">
              {inviteSuccess}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 py-2.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!inviteSuccess}
              className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:bg-amber-900 disabled:text-amber-700 text-zinc-950 rounded-lg transition-colors"
            >
              {loading ? 'Sending…' : inviteSuccess ? 'Sent ✓' : 'Send Invitation'}
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
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
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
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
    />
  )
}

export default InviteEmployeeDialog

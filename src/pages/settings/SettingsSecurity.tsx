/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { z } from 'zod'
import { useOrgApi } from '../../hooks/useOrgApi'
import { useMutation } from '@tanstack/react-query'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { toast } from 'sonner'
import { Loader2, Key, Smartphone, LogOut } from 'lucide-react'

// Validate password strength and matching
const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsSecurity() {
  const { apiFetch } = useOrgApi()

  const [formData, setFormData] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordFormData, string>>>({})

  // Mutation to update password via your Express backend
  const updatePassword = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      return apiFetch('users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password,
        }),
      })
    },
    onSuccess: () => {
      toast.success('Password updated successfully')
      setFormData({ current_password: '', new_password: '', confirm_password: '' })
      setErrors({})
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update password')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = passwordSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: any = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    updatePassword.mutate(result.data)
  }

  // Placeholder mutation for logging out of all devices
  const revokeSessions = useMutation({
    mutationFn: async () => {
      return apiFetch('users/me/sessions', { method: 'DELETE' })
    },
    onSuccess: () => toast.success('Logged out of all other devices'),
    onError: (err: any) => toast.error(err.message || 'Failed to revoke sessions'),
  })

  return (
    <div className="space-y-6">
      {/* --- CHANGE PASSWORD SECTION --- */}
      <div className="settings-card-tab bg-white border rounded-lg p-6 shadow-sm">
        <div className="settings-card-tab__header mb-6 flex items-center gap-2">
          <Key className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="settings-card-tab__title text-lg font-semibold">Change Password</h2>
            <p className="settings-card-tab__desc text-sm text-muted-foreground">
              Ensure your account is using a long, random password to stay secure.
            </p>
          </div>
        </div>

        <div className="settings-card-tab__content">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                className={errors.current_password ? 'border-red-500' : ''}
              />
              {errors.current_password && (
                <p className="text-xs text-red-500">{errors.current_password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                className={errors.new_password ? 'border-red-500' : ''}
              />
              {errors.new_password && <p className="text-xs text-red-500">{errors.new_password}</p>}
            </div>

            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                className={errors.confirm_password ? 'border-red-500' : ''}
              />
              {errors.confirm_password && (
                <p className="text-xs text-red-500">{errors.confirm_password}</p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                disabled={updatePassword.isPending}
              >
                {updatePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* --- TWO-FACTOR AUTHENTICATION --- */}
      <div className="settings-card-tab bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold">Two-Factor Authentication (2FA)</h2>
              <p className="text-sm text-muted-foreground max-w-xl mt-1">
                Add an extra layer of security to your account by requiring a verification code in
                addition to your password.
              </p>
            </div>
          </div>
          {/* Note: In an Auth0 setup, 2FA is often enforced at the tenant level or managed in the Universal Login. 
              This button could redirect to your backend to trigger an Auth0 MFA enrollment ticket. */}
          <button
            type="button"
            className="border shadow-sm px-4 py-2 rounded-md hover:bg-muted font-medium text-sm transition-colors"
          >
            Enable 2FA
          </button>
        </div>
      </div>

      {/* --- SESSION MANAGEMENT --- */}
      <div className="settings-card-tab bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <LogOut className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold">Log out of all devices</h2>
              <p className="text-sm text-muted-foreground max-w-xl mt-1">
                Log out of all other active sessions on other computers or mobile devices. This will
                not log you out of your current session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => revokeSessions.mutate()}
            disabled={revokeSessions.isPending}
            className="flex items-center gap-2 border border-destructive text-destructive px-4 py-2 rounded-md hover:bg-destructive/10 font-medium text-sm transition-colors disabled:opacity-50"
          >
            {revokeSessions.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Log out all devices
          </button>
        </div>
      </div>
    </div>
  )
}

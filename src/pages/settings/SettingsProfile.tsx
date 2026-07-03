/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { useOrgApi } from '../../hooks/useOrgApi'
import { currentUserKeys, useCurrentUser } from '../../hooks/useCurrentUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import '../../styles/settings.css'

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  emergency_contact: z.string().trim().max(100).optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function SettingsProfile() {
  const { user } = useAuth()
  const { profile } = useCurrentUser()
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    phone: '',
    address: '',
    emergency_contact: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({})

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      })
    }
  }, [profile])

  const saveProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiFetch('users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserKeys.profile(user?.id) })
      toast.success('Profile updated successfully')
      setErrors({})
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update profile')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = profileSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: any = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    saveProfile.mutate(result.data)
  }

  return (
    <div className="settings-card-tab">
      <div className="settings-card-tab__header">
        <h2 className="settings-card-tab__title">Personal Information</h2>
        <p className="settings-card-tab__desc">Update your contact details and emergency info.</p>
      </div>
      <div className="settings-card-tab__content">
        <form onSubmit={handleSubmit} className="settings-card-tab__form-grid">
          <div className="settings-card-tab__form-grid">
            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label">Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={
                  errors.full_name
                    ? 'settings-card-tab__input border-red-500'
                    : 'settings-card-tab__input'
                }
              />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
            </div>
            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label">Email Address</Label>
              <Input value={user?.email || ''} disabled className="settings-card-tab__input " />
            </div>
            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label">Phone Number</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={
                  errors.phone
                    ? 'settings-card-tab__input border-red-500'
                    : 'settings-card-tab__input'
                }
              />
            </div>
            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label">Emergency Contact</Label>
              <Input
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                className={
                  errors.emergency_contact
                    ? 'settings-card-tab__input border-red-500'
                    : 'settings-card-tab__input'
                }
              />
            </div>
            <div className="settings-card-tab__row ">
              <Label className="settings-card-tab__label">Home Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={
                  errors.address
                    ? 'settings-card-tab__input border-red-500'
                    : 'settings-card-tab__input'
                }
              />
            </div>
            <div className="settings-card-tab__footer">
              <button className="settings-card-tab__save-btn" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? (
                  <Loader2 className=" h-4 w-4 animate-spin" />
                ) : (
                  <Save className=" h-4 w-4" />
                )}
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

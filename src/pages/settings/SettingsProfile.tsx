/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { useOrgApi } from '../../hooks/useOrgApi'
import { currentUserKeys, useCurrentUser } from '../../hooks/useCurrentUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Avatar } from '../../components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, Save, Trash2, Upload } from 'lucide-react'
import '../../styles/settings.css'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  emergency_contact: z.string().trim().max(100).optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function SettingsProfile() {
  const { user, refreshUser } = useAuth()
  const { profile } = useCurrentUser()
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      return apiFetch('userinfo', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: currentUserKeys.profile(user?.id) })
      toast.success('Profile updated successfully')
      setErrors({})
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update profile')
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return apiFetch<{ avatar_url: string }>('userinfo/avatar', {
        method: 'POST',
        body: formData,
      })
    },
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: currentUserKeys.profile(user?.id) })
      toast.success('Profile photo updated')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to upload photo')
    },
  })

  const removeAvatar = useMutation({
    mutationFn: async () => {
      return apiFetch('userinfo/avatar', { method: 'DELETE' })
    },
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: currentUserKeys.profile(user?.id) })
      toast.success('Profile photo removed')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove photo')
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Unsupported image type. Use JPEG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image must be 2MB or smaller.')
      return
    }
    uploadAvatar.mutate(file)
  }

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
        <div className="settings-card-tab__avatar-row">
          <Avatar
            src={profile?.avatar_url ?? user?.avatar_url}
            name={profile?.full_name ?? user?.full_name}
            className="h-16 w-16 text-lg"
          />
          <div className="settings-card-tab__avatar-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              className="settings-card-tab__save-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload photo
            </button>
            {(profile?.avatar_url ?? user?.avatar_url) && (
              <button
                type="button"
                className="settings-card-tab__remove-btn"
                onClick={() => removeAvatar.mutate()}
                disabled={removeAvatar.isPending}
              >
                {removeAvatar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove
              </button>
            )}
            <p className="settings-card-tab__avatar-hint">JPEG, PNG or WebP. Max 2MB.</p>
          </div>
        </div>
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

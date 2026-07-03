/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useOrgApi } from '../../hooks/useOrgApi'
import { useMutation } from '@tanstack/react-query'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import '../../styles/settings.css'

export default function WorkspaceGeneral() {
  const { organization } = useAuth()
  const { apiFetch } = useOrgApi()

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    country: '',
  })

  // Pre-fill from AuthContext
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        industry: organization.industry || '',
        country: organization.country || '',
      })
    }
  }, [organization])

  const saveConfig = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Assuming your backend supports PATCH /organizations/me
      return apiFetch('organizations/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      toast.success('Workspace settings updated')
      // A full page reload or context refresh might be needed to update the sidebar org name
      // window.location.reload()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update workspace')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return toast.error('Company Name is required')
    saveConfig.mutate(formData)
  }

  return (
    <div className="settings-page">
      <div className="settings-card-tab">
        <div className="settings-header p-4">
          <h2 className="settings-header__title">Workspace Profile</h2>
          <p className="settings-header__subtitle ">Manage your company name and core details.</p>
        </div>

        <div className="settings-card-tab__content">
          <form onSubmit={handleSubmit} className="settings-card-tab__form-grid">
            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label ">Company Name</Label>
              <Input
                className="settings-card-tab__input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label ">Industry</Label>
              <Input
                className="settings-card-tab__input"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g. Construction, Tech"
              />
            </div>
            <div className="settings-card-tab__row">
              <Label className="settings-card-tab__label ">Country</Label>
              <Input
                className="settings-card-tab__input"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. South Africa"
              />
            </div>
          </form>
          <div className="settings-card-tab__footer">
            <button
              type="submit"
              className="settings-card-tab__save-btn"
              disabled={saveConfig.isPending}
            >
              {saveConfig.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

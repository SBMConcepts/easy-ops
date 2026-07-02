/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useOrgApi } from '../../hooks/useOrgApi'
import { useMutation } from '@tanstack/react-query'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { toast } from 'sonner'
import { Loader2, Save, Building } from 'lucide-react'

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
    <div className="space-y-6">
      <div className="settings-card-tab bg-white border rounded-lg p-6 shadow-sm">
        <div className="settings-card-tab__header mb-6 flex items-center gap-3">
          <Building className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="settings-card-tab__title text-lg font-semibold">Workspace Profile</h2>
            <p className="settings-card-tab__desc text-sm text-muted-foreground">
              Manage your company name and core details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g. Construction, Tech"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. South Africa"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
        </form>
      </div>
    </div>
  )
}

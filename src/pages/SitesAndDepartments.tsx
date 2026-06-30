import { useState, useMemo } from 'react'
import { useOrgApi } from '../hooks/useOrgApi'
import { useAuthRole } from '../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { toast } from 'sonner'
import { Building2, MapPin, Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react'
import '../styles/sitesanddepartments.css'

interface SiteRow {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number | null
}

interface DeptRow {
  id: string
  name: string
  site_id: string | null
  site_name?: string
}

export default function SitesAndDepartments() {
  const { isOwner, isAdmin } = useAuthRole()
  const { apiFetch } = useOrgApi()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('sites')

  // Modals state
  const [siteModalOpen, setSiteModalOpen] = useState(false)
  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'site' | 'department'
    id: string
    name: string
  } | null>(null)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [siteForm, setSiteForm] = useState<Partial<SiteRow>>({})
  const [deptForm, setDeptForm] = useState<Partial<DeptRow>>({})

  // Fetch Data
  const { data: sites = [], isLoading: sitesLoading } = useQuery<SiteRow[]>({
    queryKey: ['org_sites'],
    queryFn: () => apiFetch('sites'),
  })

  const { data: depts = [], isLoading: deptsLoading } = useQuery<DeptRow[]>({
    queryKey: ['org_departments'],
    queryFn: () => apiFetch('departments'),
  })

  // Mutations
  const saveSite = useMutation({
    mutationFn: async (data: Partial<SiteRow>) => {
      if (editingId)
        return apiFetch(`sites/${editingId}`, { method: 'PATCH', body: JSON.stringify(data) })
      return apiFetch('sites', { method: 'POST', body: JSON.stringify(data) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org_sites'] })
      setSiteModalOpen(false)
      toast.success(editingId ? 'Site updated' : 'Site created')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save site')
    },
  })

  const saveDept = useMutation({
    mutationFn: async (data: Partial<DeptRow>) => {
      if (editingId)
        return apiFetch(`departments/${editingId}`, { method: 'PATCH', body: JSON.stringify(data) })
      return apiFetch('departments', { method: 'POST', body: JSON.stringify(data) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org_departments'] })
      setDeptModalOpen(false)
      toast.success(editingId ? 'Department updated' : 'Department created')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save department')
    },
  })

  const deleteEntity = useMutation({
    mutationFn: async ({ kind, id }: { kind: 'site' | 'department'; id: string }) => {
      return apiFetch(`${kind}s/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org_sites'] })
      queryClient.invalidateQueries({ queryKey: ['org_departments'] })
      setDeleteTarget(null)
      toast.success('Deleted successfully')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    },
  })

  // Filtering
  const filteredSites = useMemo(
    () => sites.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [sites, searchQuery]
  )

  const filteredDepts = useMemo(
    () => depts.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [depts, searchQuery]
  )

  const openSiteModal = (site?: SiteRow) => {
    setEditingId(site?.id || null)
    setSiteForm(
      site || { name: '', address: '', latitude: null, longitude: null, geofence_radius_m: 200 }
    )
    setSiteModalOpen(true)
  }

  const openDeptModal = (dept?: DeptRow) => {
    setEditingId(dept?.id || null)
    setDeptForm(dept || { name: '', site_id: sites[0]?.id || '' })
    setDeptModalOpen(true)
  }

  if (sitesLoading || deptsLoading) {
    return (
      <div className="sad-page flex items-center justify-center">
        <Loader2 className="animate-spin text-dashboard-text-muted h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="sad-page">
      <div className="sad-header">
        <h1 className="sad-header__title">Sites & Departments</h1>
        <p className="sad-header__subtitle">Manage your operational infrastructure</p>
      </div>

      {/* Stats Summary */}
      <div className="sad-grid">
        <div className="sad-card">
          <div className="sad-card__content sad-stat">
            <div className="sad-stat__icon-wrap sad-stat__icon-wrap--primary">
              <MapPin size={24} />
            </div>
            <div className="sad-stat__info">
              <p className="sad-stat__value">{sites.length}</p>
              <p className="sad-stat__label">Active Sites</p>
            </div>
          </div>
        </div>
        <div className="sad-card">
          <div className="sad-card__content sad-stat">
            <div className="sad-stat__icon-wrap sad-stat__icon-wrap--primary">
              <Building2 size={24} />
            </div>
            <div className="sad-stat__info">
              <p className="sad-stat__value">{depts.length}</p>
              <p className="sad-stat__label">Active Departments</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="sad-tabs">
        <TabsList className="sad-tabs__nav">
          <TabsTrigger value="sites" className="sad-tabs__nav-trigger">
            Sites ({filteredSites.length})
          </TabsTrigger>
          <TabsTrigger value="departments" className="sad-tabs__nav-trigger">
            Departments ({filteredDepts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="sad-tabs__content">
          <div className="sad-card-tab">
            <div className="sad-card-tab__header ">
              <div className="sad-card-tab__title">
                <span className="sad-card-tab__title-text">Operational Sites</span>
              </div>
            </div>
            <div className="sad-card-tab__actions">
              <div className="sad-card-tab__search ">
                <Search className="sad-card-tab__search-icon" />
                <Input
                  placeholder="Search sites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sad-card-tab__search-input"
                />
              </div>
              {(isAdmin || isOwner) && (
                <button className="sad-card-tab__add-btn" onClick={() => openSiteModal()}>
                  Add Site
                </button>
              )}
            </div>
            <div className="sad-list">
              {filteredSites.map((site) => (
                <div key={site.id} className="sad-list__items">
                  <div className="sad-list__item-content">
                    <p className="sad-list__item-title">{site.name}</p>
                    <p className="sad-list__item-subtitle">
                      {site.address || 'No address specified'}
                    </p>
                  </div>
                  {(isAdmin || isOwner) && (
                    <div className="flex items-center gap-2">
                      <button
                        className="sad-card-tab__edit-btn"
                        onClick={() => openSiteModal(site)}
                      >
                        <Pencil className="h-4 w-4 text-dashboard-text-muted" />
                      </button>
                      <button
                        className="sad-card-tab__delete-btn"
                        onClick={() =>
                          setDeleteTarget({ kind: 'site', id: site.id, name: site.name })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filteredSites.length === 0 && (
                <p className="sad-list__empty">No sites match your search.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="sad-tabs__content">
          <div className="sad-card-tab">
            <div className="sad-card-tab__header ">
              <div className="sad-card-tab__title">
                <span className="sad-card-tab__title-text">Operational Departments</span>
              </div>
            </div>
            <div className="sad-card-tab__actions">
              <div className="sad-card-tab__search ">
                <Search className="sad-card-tab__search-icon" />
                <Input
                  placeholder="Search departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sad-card-tab__search-input"
                />
              </div>
              {(isAdmin || isOwner) && (
                <button className="sad-card-tab__add-btn" onClick={() => openDeptModal()}>
                  Add Department
                </button>
              )}
            </div>
            <div className="sad-list">
              {filteredDepts.map((department) => (
                <div key={department.id} className="sad-list__items">
                  <div className="sad-list__item-content">
                    <p className="sad-list__item-title">{department.name}</p>
                    <p className="sad-list__item-subtitle">
                      {department.site_name ||
                        sites.find((s) => s.id === department.site_id)?.name ||
                        'No site assigned'}
                    </p>
                  </div>
                  {(isAdmin || isOwner) && (
                    <div className="flex items-center gap-2">
                      <button
                        className="sad-card-tab__edit-btn"
                        onClick={() => openDeptModal(department)}
                      >
                        <Pencil className="h-4 w-4 text-dashboard-text-muted" />
                      </button>
                      <button
                        className="sad-card-tab__delete-btn"
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'department',
                            id: department.id,
                            name: department.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filteredDepts.length === 0 && (
                <p className="sad-list__empty">No departments match your search.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Sites Modal ───────────────────────────────────────────── */}
      <Dialog open={siteModalOpen} onOpenChange={setSiteModalOpen}>
        <DialogContent className="sad-modal-content">
          <DialogHeader className="sad-modal-header">
            <DialogTitle className="sad-modal-title">
              {editingId ? 'Edit Site' : 'Create New Site'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="sad-modal__row">
              <Label className="sad-modal-label">Site Name</Label>
              <Input
                className="sad-modal-input"
                value={siteForm.name || ''}
                onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                placeholder="e.g. Headquarters"
              />
            </div>
            <div className="sad-modal__row">
              <Label className="sad-modal-label">Address</Label>
              <Input
                className="sad-modal-input"
                value={siteForm.address || ''}
                onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                placeholder="123 Main St..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="sad-modal__row">
                <Label className="sad-modal-label">Latitude</Label>
                <Input
                  className="sad-modal-input"
                  type="number"
                  step="any"
                  value={siteForm.latitude || ''}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, latitude: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="sad-modal__row">
                <Label className="sad-modal-label">Longitude</Label>
                <Input
                  className="sad-modal-input"
                  type="number"
                  step="any"
                  value={siteForm.longitude || ''}
                  onChange={(e) =>
                    setSiteForm({
                      ...siteForm,
                      longitude: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="sad-modal__row">
              <Label className="sad-modal-label">Geofence Radius (meters)</Label>
              <Input
                className="sad-modal-input"
                type="number"
                step="any"
                value={siteForm.geofence_radius_m ?? ''}
                onChange={(e) =>
                  setSiteForm({
                    ...siteForm,
                    geofence_radius_m: e.target.value === '' ? null : parseFloat(e.target.value),
                  })
                }
                placeholder="200"
              />
            </div>
          </div>
          <DialogFooter className="sad-modal-footer">
            <button className="sad-modal-cancel-btn" onClick={() => setSiteModalOpen(false)}>
              Cancel
            </button>
            <button
              className="sad-modal-save-btn"
              onClick={() => saveSite.mutate(siteForm)}
              disabled={saveSite.isPending}
            >
              {saveSite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Site'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Department Modal ───────────────────────────────────────────── */}
      <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
        <DialogContent className="sad-modal-content">
          <DialogHeader className="sad-modal-header">
            <DialogTitle className="sad-modal-title">
              {editingId ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="sad-modal__row">
              <Label className="sad-modal-label">Department Name</Label>
              <Input
                className="sad-modal-input"
                value={deptForm.name || ''}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="e.g. Logistics"
              />
            </div>
            <div className="sad-modal__row">
              <Label className="sad-modal-label">Associated Site</Label>
              <Select
                value={deptForm.site_id || ''}
                onValueChange={(v) => setDeptForm({ ...deptForm, site_id: v })}
              >
                <SelectTrigger className="sad-modal-select-trigger">
                  <SelectValue className="sad-modal-select-value" placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent className="sad-modal-select-content">
                  {sites.map((s) => (
                    <SelectItem className="sad-modal-select-item" key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="sad-modal-footer">
            <button className="sad-modal-cancel-btn" onClick={() => setDeptModalOpen(false)}>
              Cancel
            </button>
            <button
              className="sad-modal-save-btn"
              onClick={() => saveDept.mutate(deptForm)}
              disabled={saveDept.isPending}
            >
              {saveDept.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Department'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sad-modal-content">
          <DialogHeader className="sad-modal-header">
            <DialogTitle className="sad-modal-title text-red-600">
              Delete {deleteTarget?.kind}
            </DialogTitle>
            <DialogDescription className="sad-modal-description">
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone
              {deleteTarget?.kind === 'site'
                ? ' and will also remove linked departments and attendance records.'
                : '.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sad-modal-footer">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteTarget &&
                deleteEntity.mutate({ kind: deleteTarget.kind, id: deleteTarget.id })
              }
              disabled={deleteEntity.isPending}
            >
              {deleteEntity.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

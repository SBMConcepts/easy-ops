/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import { useOrgApi } from '../hooks/useOrgApi'
import { useAuthRole } from '../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
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

interface SiteRow {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number | null
}

interface DepartmentRow {
  id: string
  name: string
  site_id: string | null
}

export default function SitesAndDepartments() {
  const { apiFetch } = useOrgApi()
  const { isAdmin, isOwner } = useAuthRole()
  const queryClient = useQueryClient()

  // Role-tier gates. Writes require admin tier; destructive site deletes cascade
  // to departments, so they require the owner tier.
  const canManageSites = isAdmin
  const canDeleteSites = isOwner
  const canManageDepartments = isAdmin
  const canManageAny = isAdmin

  const [activeTab, setActiveTab] = useState<'sites' | 'departments'>('sites')
  const [siteSearch, setSiteSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')

  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)

  const [editingSite, setEditingSite] = useState<SiteRow | null>(null)
  const [editingDept, setEditingDept] = useState<DepartmentRow | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'site' | 'department'
    id: string
    name: string
  } | null>(null)

  const defaultSiteForm = {
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius_m: '150',
  }
  const defaultDeptForm = { name: '', site_id: '' }

  const [siteForm, setSiteForm] = useState(defaultSiteForm)
  const [deptForm, setDeptForm] = useState(defaultDeptForm)

  const { data: sites = [], isLoading: loadingSites } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiFetch<SiteRow[]>('org-sites'),
  })

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiFetch<DepartmentRow[]>('org-departments'),
  })

  const siteNameById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites])

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveSite = useMutation({
    mutationFn: async (payload: typeof siteForm & { id?: string }) => {
      const body = {
        name: payload.name,
        address: payload.address,
        latitude: payload.latitude === '' ? null : Number(payload.latitude),
        longitude: payload.longitude === '' ? null : Number(payload.longitude),
        geofence_radius_m:
          payload.geofence_radius_m === '' ? 150 : Number(payload.geofence_radius_m),
      }
      return apiFetch(payload.id ? `org-sites/${payload.id}` : 'org-sites', {
        method: payload.id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success(editingSite ? 'Site updated' : 'Site created')
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      closeSiteDialog()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save site'),
  })

  const saveDept = useMutation({
    mutationFn: async (payload: typeof deptForm & { id?: string }) => {
      const body = { name: payload.name, site_id: payload.site_id || null }
      return apiFetch(payload.id ? `org-departments/${payload.id}` : 'org-departments', {
        method: payload.id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success(editingDept ? 'Department updated' : 'Department created')
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      closeDeptDialog()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save department'),
  })

  const deleteEntity = useMutation({
    mutationFn: async (target: { kind: 'site' | 'department'; id: string }) => {
      const path =
        target.kind === 'site' ? `org-sites/${target.id}` : `org-departments/${target.id}`
      return apiFetch(path, { method: 'DELETE' })
    },
    onSuccess: (_data, target) => {
      toast.success(target.kind === 'site' ? 'Site deleted' : 'Department deleted')
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setDeleteTarget(null)
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  })

  // ── Dialog helpers ────────────────────────────────────────────────────────
  const openCreateSite = () => {
    setEditingSite(null)
    setSiteForm(defaultSiteForm)
    setSiteDialogOpen(true)
  }
  const openEditSite = (site: SiteRow) => {
    setEditingSite(site)
    setSiteForm({
      name: site.name,
      address: site.address ?? '',
      latitude: site.latitude?.toString() ?? '',
      longitude: site.longitude?.toString() ?? '',
      geofence_radius_m: site.geofence_radius_m?.toString() ?? '150',
    })
    setSiteDialogOpen(true)
  }
  const closeSiteDialog = () => {
    setSiteDialogOpen(false)
    setEditingSite(null)
    setSiteForm(defaultSiteForm)
  }

  const openCreateDept = () => {
    setEditingDept(null)
    setDeptForm(defaultDeptForm)
    setDeptDialogOpen(true)
  }
  const openEditDept = (dept: DepartmentRow) => {
    setEditingDept(dept)
    setDeptForm({ name: dept.name, site_id: dept.site_id ?? '' })
    setDeptDialogOpen(true)
  }
  const closeDeptDialog = () => {
    setDeptDialogOpen(false)
    setEditingDept(null)
    setDeptForm(defaultDeptForm)
  }

  const submitSite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!siteForm.name.trim()) return toast.error('Site name is required')
    saveSite.mutate({ ...siteForm, id: editingSite?.id })
  }
  const submitDept = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptForm.name.trim()) return toast.error('Department name is required')
    saveDept.mutate({ ...deptForm, id: editingDept?.id })
  }

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredSites = useMemo(
    () => sites.filter((s) => s.name.toLowerCase().includes(siteSearch.toLowerCase())),
    [sites, siteSearch]
  )
  const filteredDepts = useMemo(
    () => departments.filter((d) => d.name.toLowerCase().includes(deptSearch.toLowerCase())),
    [departments, deptSearch]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Sites &amp; Departments
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {canManageAny
            ? 'Manage operational locations and the departments assigned to them'
            : 'View the operational locations and departments in your organisation'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sites' | 'departments')}>
        <TabsList className="mb-4">
          <TabsTrigger value="sites" className="gap-2">
            <MapPin className="h-4 w-4" /> Sites
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" /> Departments
          </TabsTrigger>
        </TabsList>

        {/* ── Sites ─────────────────────────────────────────────────────────── */}
        <TabsContent value="sites">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/10">
              <CardTitle className="flex items-center justify-between text-base font-semibold gap-4">
                <span>Operational Sites</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={siteSearch}
                      onChange={(e) => setSiteSearch(e.target.value)}
                      placeholder="Search sites"
                      className="pl-8 w-48"
                    />
                  </div>
                  {canManageSites && (
                    <Button size="sm" onClick={openCreateSite}>
                      <Plus className="mr-1.5 h-4 w-4" /> Add Site
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {loadingSites ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSites.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-12">No sites found.</p>
              ) : (
                filteredSites.map((site) => (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/5"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{site.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {site.address || 'No address'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {site.geofence_radius_m}m geofence
                      </Badge>
                      {canManageSites && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditSite(site)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteSites && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({ kind: 'site', id: site.id, name: site.name })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Departments ──────────────────────────────────────────────────── */}
        <TabsContent value="departments">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/10">
              <CardTitle className="flex items-center justify-between text-base font-semibold gap-4">
                <span>Departments</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      placeholder="Search departments"
                      className="pl-8 w-48"
                    />
                  </div>
                  {canManageDepartments && (
                    <Button size="sm" onClick={openCreateDept}>
                      <Plus className="mr-1.5 h-4 w-4" /> Add Department
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {loadingDepts ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDepts.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-12">
                  No departments found.
                </p>
              ) : (
                filteredDepts.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/5"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{dept.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{' '}
                        {dept.site_id
                          ? (siteNameById.get(dept.site_id) ?? 'Unknown site')
                          : 'Unassigned'}
                      </p>
                    </div>
                    {canManageDepartments && (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDept(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({ kind: 'department', id: dept.id, name: dept.name })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Site dialog ───────────────────────────────────────────────────── */}
      <Dialog open={siteDialogOpen} onOpenChange={(o) => (o ? null : closeSiteDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSite ? 'Edit Site' : 'Add Site'}</DialogTitle>
            <DialogDescription>
              Sites are physical locations employees can be assigned to and clock in at.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Name *</Label>
              <Input
                id="site_name"
                value={siteForm.name}
                onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="HQ Office"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_address">Address</Label>
              <Input
                id="site_address"
                value={siteForm.address}
                onChange={(e) => setSiteForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main Rd, Cape Town"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="site_lat">Latitude</Label>
                <Input
                  id="site_lat"
                  value={siteForm.latitude}
                  onChange={(e) => setSiteForm((f) => ({ ...f, latitude: e.target.value }))}
                  placeholder="-33.92"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_lng">Longitude</Label>
                <Input
                  id="site_lng"
                  value={siteForm.longitude}
                  onChange={(e) => setSiteForm((f) => ({ ...f, longitude: e.target.value }))}
                  placeholder="18.42"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_geo">Geofence (m)</Label>
                <Input
                  id="site_geo"
                  value={siteForm.geofence_radius_m}
                  onChange={(e) =>
                    setSiteForm((f) => ({ ...f, geofence_radius_m: e.target.value }))
                  }
                  placeholder="150"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSiteDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSite.isPending}>
                {saveSite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSite ? 'Save Changes' : 'Create Site'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Department dialog ─────────────────────────────────────────────── */}
      <Dialog open={deptDialogOpen} onOpenChange={(o) => (o ? null : closeDeptDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              Departments group employees and can be linked to a site.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept_name">Name *</Label>
              <Input
                id="dept_name"
                value={deptForm.name}
                onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Operations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_site">Site</Label>
              <Select
                value={deptForm.site_id || 'none'}
                onValueChange={(v) =>
                  setDeptForm((f) => ({ ...f, site_id: v && v !== 'none' ? v : '' }))
                }
              >
                <SelectTrigger id="dept_site">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDeptDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveDept.isPending}>
                {saveDept.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDept ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => (o ? null : setDeleteTarget(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.kind}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone
              {deleteTarget?.kind === 'site'
                ? ' and will also remove linked departments and attendance records.'
                : '.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteEntity.isPending}
              onClick={() =>
                deleteTarget &&
                deleteEntity.mutate({ kind: deleteTarget.kind, id: deleteTarget.id })
              }
            >
              {deleteEntity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

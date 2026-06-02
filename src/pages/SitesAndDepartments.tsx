import { useState } from 'react'
import { useTenantApi } from '../hooks/useTenantApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { toast } from 'sonner'
import { MapPin, Building2, Plus, Pencil, Loader2, Search, Trash2, RefreshCw } from 'lucide-react'
import type {
  SiteRow,
  DepartmentRow,
  SiteInsert,
  SiteUpdate,
  DepartmentInsert,
  DepartmentUpdate,
} from '../integrations/supabase/types'
import '../styles/pages.css'
import '../styles/sitesanddepartments.css'

export default function SitesAndDepartments() {
  const { apiFetch } = useTenantApi()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'sites' | 'departments'>('sites')
  const [siteSearch, setSiteSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')

  // Modals visibility setup
  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)

  // Edit references states
  const [editingSite, setEditingSite] = useState<SiteRow | null>(null)
  const [editingDept, setEditingDept] = useState<DepartmentRow | null>(null)

  // Form states
  const [siteForm, setSiteForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius_m: '150',
  })
  const [deptForm, setDeptForm] = useState({
    name: '',
    site_id: '',
  })

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: sites = [],
    isLoading: loadingSites,
    refetch: refetchSites,
  } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiFetch<SiteRow[]>('sites'),
  })

  const {
    data: departments = [],
    isLoading: loadingDepts,
    refetch: refetchDepts,
  } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiFetch<DepartmentRow[]>('departments'),
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveSiteMutation = useMutation({
    mutationFn: async (payload: SiteInsert | SiteUpdate) => {
      const isEdit = !!editingSite?.id
      return apiFetch(isEdit ? `sites/${editingSite?.id}` : 'sites', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success(
        editingSite ? 'Site modified successfully' : 'New operational site operationalized'
      )
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setSiteDialogOpen(false)
    },
    onError: (err: unknown) =>
      toast.error((err instanceof Error ? err.message : null) || 'Error processing site data'),
  })

  const deleteSiteMutation = useMutation({
    mutationFn: async (id: string) => apiFetch(`sites/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Site deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
    onError: (err: unknown) =>
      toast.error(
        (err instanceof Error ? err.message : null) || 'Error removing site configuration'
      ),
  })

  const saveDeptMutation = useMutation({
    mutationFn: async (payload: DepartmentInsert | DepartmentUpdate) => {
      const isEdit = !!editingDept?.id
      return apiFetch(isEdit ? `departments/${editingDept?.id}` : 'departments', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success(
        editingDept ? 'Department details updated' : 'New internal tracking department provisioned'
      )
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setDeptDialogOpen(false)
    },
    onError: (err: unknown) =>
      toast.error(
        (err instanceof Error ? err.message : null) || 'Error executing department action'
      ),
  })

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => apiFetch(`departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Department entry archived')
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (err: unknown) =>
      toast.error(
        (err instanceof Error ? err.message : null) || 'Failed archiving target department'
      ),
  })

  // ── Handle Open Actions ────────────────────────────────────────────────────
  const openAddSite = () => {
    setEditingSite(null)
    setSiteForm({ name: '', address: '', latitude: '', longitude: '', geofence_radius_m: '150' })
    setSiteDialogOpen(true)
  }

  const openEditSite = (site: SiteRow) => {
    setEditingSite(site)
    setSiteForm({
      name: site.name,
      address: site.address || '',
      latitude: site.latitude?.toString() || '',
      longitude: site.longitude?.toString() || '',
      geofence_radius_m: site.geofence_radius_m?.toString() || '150',
    })
    setSiteDialogOpen(true)
  }

  const openAddDept = () => {
    setEditingDept(null)
    setDeptForm({ name: '', site_id: sites[0]?.id || '' })
    setDeptDialogOpen(true)
  }

  const openEditDept = (dept: DepartmentRow) => {
    setEditingDept(dept)
    setDeptForm({
      name: dept.name,
      site_id: dept.site_id || '',
    })
    setDeptDialogOpen(true)
  }

  // ── Submissions ────────────────────────────────────────────────────────────
  const handleSaveSite = () => {
    if (!siteForm.name.trim()) return toast.error('Site designation is required')

    const lat = parseFloat(siteForm.latitude)
    const lng = parseFloat(siteForm.longitude)
    const radius = parseInt(siteForm.geofence_radius_m, 10)

    saveSiteMutation.mutate({
      name: siteForm.name.trim(),
      address: siteForm.address.trim(),
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lng) ? null : lng,
      geofence_radius_m: radius,
    })
  }

  const handleSaveDept = () => {
    if (!deptForm.name.trim()) return toast.error('Department field name missing')
    saveDeptMutation.mutate({
      name: deptForm.name.trim(),
      site_id: deptForm.site_id || null,
    })
  }

  // Filter Arrays locally matching dynamic searches
  const filteredSites = sites.filter((s) => s.name.toLowerCase().includes(siteSearch.toLowerCase()))
  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase())
  )

  const isLoading = activeTab === 'sites' ? loadingSites : loadingDepts

  return (
    <div className="sad-page page-container">
      {/* Header Banner */}
      <div className="sad-header-block flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sites & Departments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure work boundaries, localized sites, and operational structural units.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === 'sites' ? refetchSites() : refetchDepts())}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Sync Data
          </Button>
          <Button size="sm" onClick={activeTab === 'sites' ? openAddSite : openAddDept}>
            <Plus className="h-4 w-4 mr-1" /> Add {activeTab === 'sites' ? 'Site' : 'Department'}
          </Button>
        </div>
      </div>

      {/* Aggregate Structural Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          iconClass="text-secondary bg-secondary/10"
          value={sites.length}
          label="Configured Work Sites"
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          iconClass="text-primary bg-primary/10"
          value={departments.length}
          label="Active Tracked Departments"
        />
      </div>

      {/* Core Operational Workspaces Tabs view */}
      <div className="sad-tabs-section mt-6">
        <Tabs
          defaultValue="sites"
          onValueChange={(val) => setActiveTab(val as 'sites' | 'departments')}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="sites">Sites Configuration</TabsTrigger>
            <TabsTrigger value="departments">Department Routing</TabsTrigger>
          </TabsList>

          {/* Sites Configuration Tab Content Context */}
          <TabsContent value="sites">
            <Card className="shadow-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter site targets..."
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  className="max-w-xs border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <CardContent className="p-0">
                <div className="sad-table-wrapper">
                  <table className="sad-data-table">
                    <thead>
                      <tr>
                        <th>Site Name</th>
                        <th>Address</th>
                        <th>GPS Geo-Coordinates</th>
                        <th>Radius Check</th>
                        <th className="text-right">Management</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSites.map((site) => (
                        <tr key={site.id}>
                          <td className="font-semibold">{site.name}</td>
                          <td className="text-muted-foreground">{site.address || '—'}</td>
                          <td className="cell-mono text-xs">
                            {site.latitude && site.longitude
                              ? `${site.latitude}, ${site.longitude}`
                              : 'Not mapped'}
                          </td>
                          <td>
                            {site.geofence_radius_m ? (
                              <Badge variant="secondary">{site.geofence_radius_m}m Range</Badge>
                            ) : (
                              <Badge variant="outline">No Boundary</Badge>
                            )}
                          </td>
                          <td className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditSite(site)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => deleteSiteMutation.mutate(site.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filteredSites.length === 0 && (
                        <tr>
                          <td colSpan={5} className="sad-table-empty">
                            No workspace sites found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Department Content Tab Context */}
          <TabsContent value="departments">
            <Card className="shadow-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter department codes..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  className="max-w-xs border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <CardContent className="p-0">
                <div className="sad-table-wrapper">
                  <table className="sad-data-table">
                    <thead>
                      <tr>
                        <th>Department Title</th>
                        <th>Primary Site Context</th>
                        <th className="text-right">Management</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDepts.map((dept) => {
                        const boundSite = sites.find((s) => s.id === dept.site_id)
                        return (
                          <tr key={dept.id}>
                            <td className="font-semibold">{dept.name}</td>
                            <td>
                              <Badge variant="outline">
                                {boundSite ? boundSite.name : 'Global Allocation'}
                              </Badge>
                            </td>
                            <td className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDept(dept)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => deleteDeptMutation.mutate(dept.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredDepts.length === 0 && (
                        <tr>
                          <td colSpan={4} className="sad-table-empty">
                            No departments matching selection parameters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog Modals Area ──────────────────────────────────────────────── */}

      {/* Site Dialog Modal Context */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSite ? 'Edit Workspace Site Details' : 'Provision New Operational Boundary'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Site Name / Factory Designation *</Label>
              <Input
                value={siteForm.name}
                onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                placeholder="Durban Distribution Hub"
              />
            </div>
            <div className="space-y-1">
              <Label>Physical Street Address</Label>
              <Input
                value={siteForm.address}
                onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                placeholder="45 Extraction Way, Industrial Area"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Latitude coordinate</Label>
                <Input
                  type="number"
                  step="any"
                  value={siteForm.latitude}
                  onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })}
                  placeholder="-29.8587"
                />
              </div>
              <div className="space-y-1">
                <Label>Longitude coordinate</Label>
                <Input
                  type="number"
                  step="any"
                  value={siteForm.longitude}
                  onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })}
                  placeholder="31.0218"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Geofencing Attendance Validation Radius (meters)</Label>
              <Input
                type="number"
                value={siteForm.geofence_radius_m}
                onChange={(e) => setSiteForm({ ...siteForm, geofence_radius_m: e.target.value })}
                placeholder="150"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSite} disabled={saveSiteMutation.isPending}>
              {saveSiteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSite ? 'Update Changes' : 'Confirm Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog Modal Context */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Operational Department' : 'Configure New Department Allocation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Department Title Name *</Label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="Logistics & Freight Planning"
              />
            </div>

            <div className="space-y-1">
              <Label>Assigned Primary Site Boundary</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={deptForm.site_id}
                onChange={(e) => setDeptForm({ ...deptForm, site_id: e.target.value })}
              >
                <option value="">— Globally Allocated / Multi-Site —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveDept} disabled={saveDeptMutation.isPending}>
              {saveDeptMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingDept ? 'Update Details' : 'Create Unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Shared Metric Auxiliary Layout Presenter Component ───────────────────── */
function StatCard({
  icon,
  iconClass,
  value,
  label,
}: {
  icon: React.ReactNode
  iconClass: string
  value: number
  label: string
}) {
  return (
    <Card className="sad-stat-card shadow-card">
      <CardContent className="sad-stat-content p-6 flex items-center gap-4">
        <div className={`sad-stat-icon-wrap p-3 rounded-full ${iconClass}`}>{icon}</div>
        <div>
          <p className="sad-stat-value text-2xl font-bold">{value}</p>
          <p className="sad-stat-label text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

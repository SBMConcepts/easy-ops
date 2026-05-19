import { useState, useEffect } from 'react'
import { createSupabaseClient } from '../integrations/supabase/client'
import { useAuth } from '../contexts/AuthContext'
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
import {
  MapPin,
  Building2,
  Users,
  Plus,
  Pencil,
  BarChart3,
  Loader2,
  Search,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import '../styles/pages.css'
import '../styles/sitesanddepartments.css'

interface Site {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number | null
  organisation_id: string | null
  created_at: string
}

interface Department {
  id: string
  name: string
  site_id: string | null
  organisation_id: string | null
  created_at: string
  employee_count?: number
}

interface SiteActivity {
  date: string
  present: number
  late: number
  absent: number
  total_hours: number
}

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const EMPTY_SITE_FORM = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  geofence_radius_m: '200',
}

const EMPTY_DEPT_FORM = { name: '', site_id: '' }

/* ─── Component ──────────────────────────────────────────────────────────────── */

export default function SitesAndDepartments() {
  const { user, getAccessToken } = useAuth()
  const orgId = user?.organisation_id ?? null

  // Data
  const [sites, setSites] = useState<Site[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  // UI
  const [search, setSearch] = useState('')
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [activityData, setActivityData] = useState<SiteActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Site dialog
  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [siteForm, setSiteForm] = useState(EMPTY_SITE_FORM)
  const [savingSite, setSavingSite] = useState(false)

  // Department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deptForm, setDeptForm] = useState(EMPTY_DEPT_FORM)
  const [savingDept, setSavingDept] = useState(false)

  /* ── Data fetching ───────────────────────────────────────────────────────────── */

  const fetchData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const token = await getAccessToken()
      const supabase = createSupabaseClient(token)
      const [sitesRes, deptsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('sites') as any).select('*').eq('organisation_id', orgId).order('name'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('departments') as any)
          .select('*')
          .eq('organisation_id', orgId)
          .order('name'),
      ])

      if (sitesRes.error) throw sitesRes.error
      if (deptsRes.error) throw deptsRes.error

      const depts = (deptsRes.data ?? []) as Omit<Department, 'employee_count'>[]

      // Build employee count map
      const empCounts: Record<string, number> = {}
      const deptIds = depts.map((d) => d.id)
      if (deptIds.length > 0) {
        const { data: empData } = await supabase
          .from('profiles')
          .select('department_id')
          .in('department_id', deptIds)
          .eq('organisation_id', orgId)
        ;((empData as unknown as { department_id: string | null }[]) ?? []).forEach((e) => {
          if (e.department_id) empCounts[e.department_id] = (empCounts[e.department_id] ?? 0) + 1
        })
      }

      setSites((sitesRes.data ?? []) as Site[])
      setDepartments(depts.map((d) => ({ ...d, employee_count: empCounts[d.id] ?? 0 })))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const fetchSiteActivity = async (site: Site) => {
    setActivityLoading(true)
    try {
      // eslint-disable-next-line react-hooks/purity
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      const token = await getAccessToken()
      const supabase = createSupabaseClient(token)

      const { data, error } = await supabase
        .from('attendance_records')
        .select('date, status, hours_worked')
        .eq('site_id', site.id)
        .gte('date', sevenDaysAgo)
        .lte('date', today)
        .order('date', { ascending: false })

      if (error) throw error

      const byDate: Record<
        string,
        { present: number; late: number; absent: number; total_hours: number }
      > = {}
      ;(data ?? []).forEach((r: { date: string; status: string; hours_worked: number | null }) => {
        byDate[r.date] ??= { present: 0, late: 0, absent: 0, total_hours: 0 }
        if (r.status === 'present') byDate[r.date].present++
        if (r.status === 'late') byDate[r.date].late++
        if (r.status === 'absent') byDate[r.date].absent++
        byDate[r.date].total_hours += Number(r.hours_worked ?? 0)
      })

      setActivityData(Object.entries(byDate).map(([date, vals]) => ({ date, ...vals })))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setActivityLoading(false)
    }
  }

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site)
    fetchSiteActivity(site)
  }

  /* ── Site CRUD ───────────────────────────────────────────────────────────────── */

  const openAddSite = () => {
    setEditingSite(null)
    setSiteForm(EMPTY_SITE_FORM)
    setSiteDialogOpen(true)
  }

  const openEditSite = (site: Site) => {
    setEditingSite(site)
    setSiteForm({
      name: site.name,
      address: site.address ?? '',
      latitude: site.latitude !== null ? String(site.latitude) : '',
      longitude: site.longitude !== null ? String(site.longitude) : '',
      geofence_radius_m: site.geofence_radius_m !== null ? String(site.geofence_radius_m) : '200',
    })
    setSiteDialogOpen(true)
  }

  const handleSaveSite = async () => {
    if (!siteForm.name.trim()) {
      toast.error('Site name is required')
      return
    }
    setSavingSite(true)
    try {
      const token = await getAccessToken()
      const supabase = createSupabaseClient(token)
      const payload = {
        name: siteForm.name.trim(),
        address: siteForm.address.trim() || null,
        latitude: siteForm.latitude ? Number(siteForm.latitude) : null,
        longitude: siteForm.longitude ? Number(siteForm.longitude) : null,
        geofence_radius_m: siteForm.geofence_radius_m ? Number(siteForm.geofence_radius_m) : 200,
        organisation_id: orgId,
      }

      if (editingSite) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('sites') as any)
          .update(payload)
          .eq('id', editingSite.id)
        if (error) throw error
        toast.success('Site updated')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('sites') as any).insert(payload)
        if (error) throw error
        toast.success('Site added')
      }

      setSiteDialogOpen(false)
      await fetchData()

      if (selectedSite?.id === editingSite?.id) {
        const refreshed = sites.find((s) => s.id === editingSite?.id)
        if (refreshed) handleSelectSite(refreshed)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingSite(false)
    }
  }

  const handleDeleteSite = async (site: Site) => {
    if (!window.confirm(`Delete site "${site.name}"? This cannot be undone.`)) return
    try {
      const token = await getAccessToken()
      const supabase = createSupabaseClient(token)
      const { error } = await supabase.from('sites').delete().eq('id', site.id)
      if (error) throw error
      toast.success('Site deleted')
      if (selectedSite?.id === site.id) setSelectedSite(null)
      await fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  /* ── Department CRUD ─────────────────────────────────────────────────────────── */

  const openAddDept = (siteId?: string) => {
    setEditingDept(null)
    setDeptForm({ name: '', site_id: siteId ?? '' })
    setDeptDialogOpen(true)
  }

  const openEditDept = (dept: Department) => {
    setEditingDept(dept)
    setDeptForm({ name: dept.name, site_id: dept.site_id ?? '' })
    setDeptDialogOpen(true)
  }

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) {
      toast.error('Department name is required')
      return
    }
    setSavingDept(true)
    try {
      const token = await getAccessToken()
      const supabase = createSupabaseClient(token)
      const payload = {
        name: deptForm.name.trim(),
        site_id: deptForm.site_id || null,
        organisation_id: orgId,
      }

      if (editingDept) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('departments') as any)
          .update(payload)
          .eq('id', editingDept.id)
        if (error) throw error
        toast.success('Department updated')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('departments') as any).insert(payload)
        if (error) throw error
        toast.success('Department added')
      }

      setDeptDialogOpen(false)
      await fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingDept(false)
    }
  }

  const handleDeleteDept = async (dept: Department) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return
    try {
      const token = await getAccessToken()
      const supabase = createSupabaseClient(token)
      const { error } = await supabase.from('departments').delete().eq('id', dept.id)
      if (error) throw error
      toast.success('Department deleted')
      await fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  /* ── Derived ─────────────────────────────────────────────────────────────────── */

  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.address ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const deptsBySite = (siteId: string) => departments.filter((d) => d.site_id === siteId)

  const totalEmployees = departments.reduce((sum, d) => sum + (d.employee_count ?? 0), 0)

  /* ── Render ──────────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="page-loader">
        <div className="page-spinner" />
      </div>
    )
  }

  return (
    <div className="page">
      {/* ── Page heading ─── */}
      <div className="page-heading">
        <div className="page-heading-text">
          <h1 className="page-title">Sites &amp; Departments</h1>
          <p className="page-subtitle">Manage locations, departments and activity reports</p>
        </div>
        <div className="sad-heading-actions">
          <Button variant="outline" onClick={() => openAddDept()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
          <Button onClick={openAddSite}>
            <Plus className="h-4 w-4 mr-2" />
            Add Site
          </Button>
        </div>
      </div>

      {/* ── Summary stats ─── */}
      <div className="sad-stat-grid">
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          iconClass="sad-stat-icon-primary"
          value={sites.length}
          label="Total Sites"
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          iconClass="sad-stat-icon-secondary"
          value={departments.length}
          label="Departments"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconClass="sad-stat-icon-accent"
          value={totalEmployees}
          label="Assigned Employees"
        />
      </div>

      {/* ── One-column layout ─── */}
      <div className="sad-main">
        {/* Top: site list */}
        <div className="sad-header-panel">
          <div className="sad-header-content">
            <div className="sad-header-content-top">
              <div className="sad-header-title">
                <MapPin className="h-4 w-4 icon-primary" />
                Sites
              </div>
              <div className="sad-header-search-wrap">
                <Search className="h-4 w-4 sad-search-icon " />
                <Input
                  placeholder="Search sites…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="sad-search-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/** Site and Department list */}
        <div className="sad-site-list">
          {filteredSites.length === 0 ? (
            <p className="sad-empty">
              {search ? 'No sites match your search.' : 'No sites yet. Add your first site.'}
            </p>
          ) : (
            filteredSites.map((site) => {
              const depts = deptsBySite(site.id)
              const isActive = selectedSite?.id === site.id
              return (
                <div
                  key={site.id}
                  className={`sad-site-item${isActive ? ' sad-site-item--active' : ''} shadow-card`}
                  onClick={() => handleSelectSite(site)}
                >
                  <div className="sad-site-item-main">
                    <div className="sad-site-item-name">
                      <MapPin className="h-4 w-4 sad-site-item-icon" />
                      {site.name}
                    </div>
                    {site.address && <p className="sad-site-item-address">{site.address}</p>}
                    <div className="sad-site-item-meta">
                      <Badge variant="secondary" className="sad-badge-depts">
                        {depts.length} dept{depts.length !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline" className="sad-badge-employees">
                        {depts.reduce((s, d) => s + (d.employee_count ?? 0), 0)} employees
                      </Badge>
                    </div>
                  </div>

                  <div className="sad-site-item-actions" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => openEditSite(site)}
                      title="Edit site"
                      className="sad-edit-btn"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="sad-delete-btn"
                      onClick={() => handleDeleteSite(site)}
                      title="Delete site"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="sad-detail-panel">
          {selectedSite ? (
            <Tabs defaultValue="departments" className="sad-detail-content">
              {/* ── Header ── */}
              <div className="sad-detail-header">
                <div className="sad-detail-header-info">
                  <h2 className="sad-detail-title">{selectedSite.name}</h2>
                  {selectedSite.address && (
                    <p className="sad-detail-subtitle">{selectedSite.address}</p>
                  )}
                </div>
                <div className="sad-detail-header-actions">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchSiteActivity(selectedSite)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => openAddDept(selectedSite.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Dept
                  </Button>
                </div>
              </div>

              {/* ── Tab bar ── */}
              <TabsList className="sad-tabs-list" aria-label="Select details view">
                <TabsTrigger value="departments">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Departments
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Activity Report
                </TabsTrigger>
                <TabsTrigger value="info">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Site Info
                </TabsTrigger>
              </TabsList>

              {/* ── Departments ── */}
              <TabsContent value="departments" className="sad-tab-body">
                <Card className="sad-tab-card shadow-card">
                  <CardContent className="sad-dept-list">
                    {deptsBySite(selectedSite.id).length === 0 ? (
                      <div className="sad-dept-empty">
                        <Building2 className="h-8 w-8 sad-placeholder-icon" />
                        <p className="sad-dept-empty-text">No departments for this site.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddDept(selectedSite.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Department
                        </Button>
                      </div>
                    ) : (
                      deptsBySite(selectedSite.id).map((dept) => (
                        <div key={dept.id} className="sad-dept-item">
                          <div className="sad-dept-item-info">
                            <Building2 className="h-4 w-4 sad-dept-item-icon" />
                            <div>
                              <p className="sad-dept-item-name">{dept.name}</p>
                              <p className="sad-dept-item-count">
                                {dept.employee_count ?? 0} employee
                                {dept.employee_count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="sad-dept-item-actions">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="sad-edit-btn"
                              onClick={() => openEditDept(dept)}
                              title="Edit department"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="sad-delete-btn"
                              onClick={() => handleDeleteDept(dept)}
                              title="Delete department"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Activity ── */}
              <TabsContent value="activity" className="sad-tab-body">
                <Card className="sad-tab-card shadow-card">
                  <CardHeader>
                    <CardTitle className="card-title-row">
                      <BarChart3 className="h-4 w-4 icon-primary" />
                      Last 7 Days — {selectedSite.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activityLoading ? (
                      <div className="page-loader">
                        <div className="page-spinner" />
                      </div>
                    ) : activityData.length === 0 ? (
                      <p className="sad-empty">No attendance records in the last 7 days.</p>
                    ) : (
                      <div className="sad-activity-list">
                        {activityData.map((row) => (
                          <div key={row.date} className="sad-activity-row">
                            <p className="sad-activity-date">
                              {new Date(row.date).toLocaleDateString('en-ZA', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                            <div className="sad-activity-badges">
                              <span className="sad-activity-badge sad-badge-present">
                                <CheckCircle2 className="h-3 w-3" />
                                {row.present} present
                              </span>
                              <span className="sad-activity-badge sad-badge-late">
                                <Clock className="h-3 w-3" />
                                {row.late} late
                              </span>
                              <span className="sad-activity-badge sad-badge-absent">
                                <AlertCircle className="h-3 w-3" />
                                {row.absent} absent
                              </span>
                              <span className="sad-activity-badge sad-badge-hours">
                                {row.total_hours.toFixed(1)} hrs
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Site Info ── */}
              <TabsContent value="info" className="sad-tab-body">
                <Card className="sad-tab-card shadow-card">
                  <CardHeader>
                    <CardTitle className="card-title-row">
                      <MapPin className="h-4 w-4 icon-primary" />
                      Site Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="sad-info-grid">
                    <InfoRow label="Name" value={selectedSite.name} />
                    <InfoRow label="Address" value={selectedSite.address ?? '—'} />
                    <InfoRow
                      label="Latitude"
                      value={selectedSite.latitude !== null ? String(selectedSite.latitude) : '—'}
                    />
                    <InfoRow
                      label="Longitude"
                      value={selectedSite.longitude !== null ? String(selectedSite.longitude) : '—'}
                    />
                    <InfoRow
                      label="Geofence Radius"
                      value={
                        selectedSite.geofence_radius_m !== null
                          ? `${selectedSite.geofence_radius_m} m`
                          : '—'
                      }
                    />
                    <InfoRow
                      label="Created"
                      value={new Date(selectedSite.created_at).toLocaleDateString('en-ZA')}
                    />
                  </CardContent>
                </Card>
                <div className="sad-info-actions">
                  <Button variant="outline" onClick={() => openEditSite(selectedSite)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Site
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteSite(selectedSite)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Site
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="sad-placeholder shadow-card">
              <CardContent className="sad-placeholder-content">
                <MapPin className="h-10 w-10 sad-placeholder-icon" />
                <p className="sad-placeholder-text">
                  Select a site to view departments, activity reports, and details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Site dialog ─── */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader className="pb-2 mb-2 border-b flex items-center justify-between">
            <DialogTitle className="font-semibold text-lg flex items-center">
              {editingSite ? 'Edit Site' : 'Add Site'}
            </DialogTitle>
          </DialogHeader>
          <div className="sad-form max-w-md">
            <div className="sad-form-group">
              <Label className="font-semibold text-md" htmlFor="site-name">
                Site Name *
              </Label>
              <Input
                className="sad-native-input"
                id="site-name"
                value={siteForm.name}
                onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Cape Town Office"
              />
            </div>
            <div className="sad-form-group">
              <Label className="font-semibold text-md" htmlFor="site-address">
                Address *
              </Label>
              <Input
                className="sad-native-input"
                id="site-address"
                value={siteForm.address}
                onChange={(e) => setSiteForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, Cape Town"
              />
            </div>
            <div className="sad-form-row">
              <div className="sad-form-group">
                <Label className="font-semibold text-md" htmlFor="site-lat">
                  Latitude
                </Label>
                <Input
                  className="sad-native-input"
                  id="site-lat"
                  type="number"
                  value={siteForm.latitude}
                  onChange={(e) => setSiteForm((f) => ({ ...f, latitude: e.target.value }))}
                  placeholder="-33.9249"
                />
              </div>
              <div className="sad-form-group">
                <Label className="font-semibold text-md" htmlFor="site-lng">
                  Longitude
                </Label>
                <Input
                  className="sad-native-input"
                  id="site-lng"
                  type="number"
                  value={siteForm.longitude}
                  onChange={(e) => setSiteForm((f) => ({ ...f, longitude: e.target.value }))}
                  placeholder="18.4241"
                />
              </div>
            </div>
            <div className="sad-form-group">
              <Label className="font-semibold text-md" htmlFor="site-geo">
                Geofence Radius (metres)
              </Label>
              <Input
                id="site-geo"
                className="sad-native-input"
                type="number"
                min={0}
                value={siteForm.geofence_radius_m}
                onChange={(e) => setSiteForm((f) => ({ ...f, geofence_radius_m: e.target.value }))}
                placeholder="200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSite} disabled={savingSite} className="sad-dialog-save-btn">
              {savingSite && <Loader2 className="h-4 w-4 mr-2 animate-spin " />}
              {editingSite ? 'Save Changes' : 'Add Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Department dialog ─── */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader className="border-b pb-2 mb-4">
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="sad-form">
            <div className="sad-form-group">
              <Label htmlFor="dept-name">Department Name *</Label>
              <Input
                id="dept-name"
                className="sad-native-input"
                value={deptForm.name}
                onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="sad-form-group">
              <Label htmlFor="dept-site">Site</Label>
              <select
                id="dept-site"
                className="sad-native-select"
                value={deptForm.site_id}
                onChange={(e) => setDeptForm((f) => ({ ...f, site_id: e.target.value }))}
              >
                <option value="">— No site assigned —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveDept} disabled={savingDept} className="sad-dialog-save-btn">
              {savingDept && <Loader2 className="h-4 w-4 mr-2 animate-spin " />}
              {editingDept ? 'Save Changes' : 'Add Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

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
      <CardContent className="sad-stat-content">
        <div className={`sad-stat-icon-wrap ${iconClass}`}>{icon}</div>
        <div>
          <p className="sad-stat-value">{value}</p>
          <p className="sad-stat-label">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sad-info-row">
      <p className="sad-info-label">{label}</p>
      <p className="sad-info-value">{value}</p>
    </div>
  )
}

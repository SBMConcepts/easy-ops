import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { createSupabaseClient } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Save, User, Briefcase, Shield, Calendar } from 'lucide-react'
import '../styles/settings.css'
import '../styles/pages.css'

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  job_title: z.string().trim().max(100).optional().or(z.literal('')),
  id_number: z.string().trim().max(50).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  emergency_contact_name: z.string().trim().max(100).optional().or(z.literal('')),
  emergency_contact_phone: z.string().trim().max(30).optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

const empty: ProfileForm = {
  full_name: '',
  phone: '',
  address: '',
  job_title: '',
  id_number: '',
  date_of_birth: '',
  start_date: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  bio: '',
}

const Settings = () => {
  const { user, getAccessToken, refreshOrganisation } = useAuth()
  const [form, setForm] = useState<ProfileForm>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const token = await getAccessToken()
      const db = createSupabaseClient(token)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: raw, error } = await (db.from('profiles') as any)
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) toast.error('Failed to load profile')
      else if (raw) {
        const data = raw as Database['public']['Tables']['profiles']['Row']
        setForm({
          full_name: data.full_name ?? '',
          phone: data.cell_number ?? '',
          address: data.address ?? '',
          job_title: '',
          id_number: data.id_number ?? '',
          date_of_birth: data.date_of_birth ?? '',
          start_date: data.start_date ?? '',
          emergency_contact_name: data.emergency_contact_name ?? '',
          emergency_contact_phone: data.emergency_contact_phone ?? '',
          bio: data.bio ?? '',
        })
      }
      setLoading(false)
    })()
  }, [user?.id])

  // Role-specific data
  const { data: myAttendance } = useQuery({
    queryKey: ['settings-my-attendance', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const token = await getAccessToken()
      const db = createSupabaseClient(token)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db.from('attendance_records') as any)
        .select('date, clock_in, clock_out, hours_worked, status')
        .eq('employee_id', user!.id)
        .order('date', { ascending: false })
        .limit(10)
      return (data ?? []) as Array<{
        date: string
        clock_in: string | null
        clock_out: string | null
        hours_worked: string | null
        status: string
      }>
    },
  })

  const { data: teamCount } = useQuery({
    queryKey: ['settings-team-count', user?.role, user?.site, user?.department],
    enabled: !!user && user.role !== 'employee',
    queryFn: async () => {
      const token = await getAccessToken()
      const db = createSupabaseClient(token)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (db.from('profiles') as any).select('id', { count: 'exact', head: true })
      if (user!.role === 'supervisor' && user!.site) q = q.eq('profile_site_id', user!.site)
      if (user!.role === 'manager' && user!.department) q = q.eq('department_id', user!.department)
      const { count } = await q
      return count ?? 0
    },
  })

  const update =
    (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    const parsed = profileSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message)
      return
    }
    if (!user?.id) return
    setSaving(true)
    const token = await getAccessToken()
    const db = createSupabaseClient(token)
    const payload: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (k === 'job_title') continue // no DB column
      const dbKey = k === 'phone' ? 'cell_number' : k
      payload[dbKey] = v === '' ? null : (v as string)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from('profiles') as any).update(payload).eq('id', user.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Profile updated')
      refreshOrganisation()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="page">
      {/* ── Page heading ─── */}
      <div className="page-heading">
        <div className="page-heading-text">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile and view your role-based information.</p>
        </div>
      </div>

      <div className="settings-main">
        <Tabs defaultValue="profile" className="settings-tabs-root">
          {/* Tab bar — always visible, never reflowed */}
          <TabsList className="settings-tabs-list">
            <TabsTrigger value="profile" className="settings-tabs-trigger">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="role" className="settings-tabs-trigger">
              <Shield className="h-4 w-4 mr-2" />
              Role &amp; Access
            </TabsTrigger>
            <TabsTrigger value="activity" className="settings-tabs-trigger">
              <Calendar className="h-4 w-4 mr-2" />
              My Activity
            </TabsTrigger>
          </TabsList>

          {/* ── Tab content container — fixed below the tab bar ── */}
          <div className="settings-tabs-body">
            <TabsContent value="profile" className="settings-tab-panel">
              <Card className="settings-tab-card shadow-card">
                <CardHeader className="settings-tab-card-header">
                  <CardTitle className="settings-tab-card-title">Personal Information</CardTitle>
                  <CardDescription className="settings-tab-card-description">
                    Information used across your employee profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="settings-form-grid">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      className="settings-native-input"
                      id="full_name"
                      value={form.full_name}
                      onChange={update('full_name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      className="settings-native-input"
                      id="email"
                      value={user?.email ?? ''}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      className="settings-native-input"
                      id="phone"
                      value={form.phone}
                      onChange={update('phone')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_number">ID Number</Label>
                    <Input
                      className="settings-native-input"
                      id="id_number"
                      value={form.id_number}
                      onChange={update('id_number')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      className="settings-native-input"
                      id="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={update('date_of_birth')}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      className="settings-native-input"
                      id="address"
                      rows={2}
                      value={form.address}
                      onChange={update('address')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="settings-tab-card shadow-card">
                <CardHeader className="settings-tab-card-header">
                  <CardTitle className="settings-tab-card-title">Employment</CardTitle>
                  <CardDescription className="settings-tab-card-description">
                    Your role at the company.
                  </CardDescription>
                </CardHeader>
                <CardContent className="settings-form-grid">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      className="settings-native-input"
                      id="job_title"
                      value={form.job_title}
                      onChange={update('job_title')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      className="settings-native-input"
                      id="start_date"
                      type="date"
                      value={form.start_date}
                      onChange={update('start_date')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input
                      className="settings-native-input"
                      value={user?.department ?? '—'}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Input className="settings-native-input" value={user?.site ?? '—'} disabled />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      className="settings-native-input"
                      id="bio"
                      rows={3}
                      value={form.bio}
                      onChange={update('bio')}
                      placeholder="A short description about yourself"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="settings-tab-card shadow-card">
                <CardHeader className="settings-tab-card-header">
                  <CardTitle className="settings-tab-card-title">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="settings-form-grid">
                  <div className="space-y-2">
                    <Label htmlFor="ec_name">Contact Name</Label>
                    <Input
                      className="settings-native-input"
                      id="ec_name"
                      value={form.emergency_contact_name}
                      onChange={update('emergency_contact_name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ec_phone">Contact Phone</Label>
                    <Input
                      className="settings-native-input"
                      id="ec_phone"
                      value={form.emergency_contact_phone}
                      onChange={update('emergency_contact_phone')}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="settings-save-row">
                <Button className="settings-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="role" className="settings-tab-panel">
              <Card className="settings-tab-card shadow-card">
                <CardHeader className="settings-tab-card-header">
                  <CardTitle className="settings-tab-card-title">
                    <Briefcase className="h-5 w-5" />
                    Your Access
                  </CardTitle>
                  <CardDescription className="settings-tab-card-description">
                    What you can do based on your role.
                  </CardDescription>
                </CardHeader>
                <CardContent className="settings-form-grid">
                  <div className="settings-role-row">
                    <span className="settings-role-label">Role:</span>
                    <Badge variant="outline" className="capitalize">
                      {user?.role}
                    </Badge>
                  </div>
                  {user?.role === 'admin' && (
                    <ul className="settings-access-list">
                      <li>Configure organisation, sites, departments, roles, shifts</li>
                      <li>Invite and manage all employees</li>
                      <li>View compliance reports and audit logs</li>
                      <li>Export payroll data</li>
                    </ul>
                  )}
                  {user?.role === 'manager' && (
                    <ul className="settings-access-list">
                      <li>View attendance for your department</li>
                      <li>Generate reports and verify attendance</li>
                      <li>Export payroll for your team</li>
                    </ul>
                  )}
                  {user?.role === 'supervisor' && (
                    <ul className="settings-access-list">
                      <li>Monitor live attendance at your site</li>
                      <li>Verify check-ins for your team</li>
                    </ul>
                  )}
                  {user?.role === 'employee' && (
                    <ul className="settings-access-list">
                      <li>Check in / out via QR, biometric, or WhatsApp</li>
                      <li>View your own attendance history</li>
                    </ul>
                  )}
                  {teamCount !== undefined && user?.role !== 'employee' && (
                    <div className="settings-team-count">
                      <p className="settings-team-count-text">
                        Team members in scope:{' '}
                        <span className="settings-team-count-value">{teamCount}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="settings-tab-panel">
              <Card className="settings-tab-card shadow-card">
                <CardHeader className="settings-tab-card-header">
                  <CardTitle className="settings-tab-card-title">Recent Attendance</CardTitle>
                  <CardDescription className="settings-tab-card-description">
                    Your last 10 check-ins.
                  </CardDescription>
                </CardHeader>
                <CardContent className="settings-form-grid">
                  {!myAttendance || myAttendance.length === 0 ? (
                    <p className="settings-empty">No attendance records yet.</p>
                  ) : (
                    <div className="settings-activity-list">
                      {myAttendance.map((r, i) => (
                        <div key={i} className="settings-activity-row">
                          <span className="settings-activity-date">{r.date}</span>
                          <span className="settings-activity-time">
                            {r.clock_in
                              ? new Date(r.clock_in).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                            {' → '}
                            {r.clock_out
                              ? new Date(r.clock_out).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                          <span className="settings-activity-hours">{r.hours_worked ?? 0}h</span>
                          <Badge variant="outline" className="capitalize">
                            {r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default Settings

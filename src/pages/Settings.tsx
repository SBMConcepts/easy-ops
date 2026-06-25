/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useMemo } from 'react'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { useAttendanceRecords } from '../hooks/useOrgData'
import { useOrgApi } from '../hooks/useOrgApi'
import { currentUserKeys, useCurrentUser } from '../hooks/useCurrentUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
})

type ProfileForm = z.infer<typeof profileSchema>

export default function Settings() {
  const { user } = useAuth()
  const { apiFetch } = useOrgApi()
  const { profile } = useCurrentUser()
  const queryClient = useQueryClient()

  // Use the updated hook for current employee attendance logs
  const { data: myAttendance = [], isLoading: loadingAttendance } = useAttendanceRecords()

  const defaultForm = useMemo(
    () => ({
      full_name: profile?.full_name || user?.full_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      job_title: profile?.job_title || '',
    }),
    [user, profile]
  )

  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})

  // Sync form when user context changes (e.g. after a save or re-auth)
  useEffect(() => {
    setForm(defaultForm)
  }, [defaultForm])

  // Mutation to handle secure profile save via Express API
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: ProfileForm) => {
      return apiFetch('/userinfo', {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      })
    },
    onSuccess: () => {
      toast.success('Profile updated successfully')
      queryClient.invalidateQueries({ queryKey: currentUserKeys.all })
    },
    onError: (error: unknown) => {
      toast.error((error instanceof Error ? error.message : null) || 'Failed to update profile')
    },
  })

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const result = profileSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProfileForm, string>> = {}
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProfileForm
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    updateProfileMutation.mutate(form)
  }

  const set = (key: keyof ProfileForm, val: string) => {
    setForm((f) => ({ ...f, [key]: val }))
  }

  return (
    <div className="settings-page page-container">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal profile details and view organizational access logs
        </p>
      </div>

      <div className="settings-content mt-6">
        <Tabs defaultValue="profile" className="w-full tabs-container">
          <TabsList className="settings-tabs-list mb-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Calendar className="h-4 w-4" /> My Attendance
            </TabsTrigger>
          </TabsList>

          <div className="tab-panels">
            <TabsContent value="profile">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact options.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => set('full_name', e.target.value)}
                        placeholder="John Doe"
                      />
                      {errors.full_name && (
                        <p className="text-xs text-destructive">{errors.full_name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted text-muted-foreground"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Identity managed securely by Auth0.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="job_title">Job Title</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="job_title"
                          value={form.job_title}
                          onChange={(e) => set('job_title', e.target.value)}
                          placeholder="Supervisor"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        placeholder="+27 82 123 4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Physical Address</Label>
                      <Textarea
                        id="address"
                        value={form.address}
                        onChange={(e) => set('address', e.target.value)}
                        placeholder="123 Main Rd, Cape Town, 8001"
                        rows={3}
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-4">
                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md border border-border/60">
                        <Shield className="h-3.5 w-3.5 text-secondary" />
                        <span className="capitalize font-medium text-foreground">
                          {user?.role} Access Mode
                        </span>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Recent Clocking History</CardTitle>
                  <CardDescription>
                    A summary audit track of your active attendance allocations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAttendance ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : myAttendance.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No attendance records found.
                    </p>
                  ) : (
                    <div className="settings-activity-list">
                      {myAttendance.map((r, i) => (
                        <div key={i} className="settings-activity-row">
                          <span className="settings-activity-date">{r.date}</span>
                          <span className="settings-activity-time uppercase">{r.method}</span>
                          <span className="settings-activity-hours">
                            {r.hours_worked}h{r.overtime ? ` +${r.overtime}h OT` : ''}
                          </span>
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

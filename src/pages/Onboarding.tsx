/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDB } from '../contexts/DatabaseContext'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import CompanyStep, { type CompanyData } from '../components/onboarding/CompanyStep'
import SitesStep, { type SiteData } from '../components/onboarding/SitesStep'
import DepartmentsStep, { type DepartmentData } from '../components/onboarding/DepartmentsStep'
import RolesStep, { type RoleData } from '../components/onboarding/RolesStep'
import ShiftsStep, { type ShiftData, type WorkRules } from '../components/onboarding/ShiftsStep'
import CheckInMethodsStep, {
  type CheckInSettings,
} from '../components/onboarding/CheckInMethodsStep'
import ReviewStep from '../components/onboarding/ReviewStep'
import { useCurrentUser } from '../hooks/useCurrentUser'
import type { Json } from '../../server/types/supabase'

const LAST_STEP = 6

export default function Onboarding() {
  const { tenant, user } = useAuth()
  const supabase = useDB()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // ── Form State ─────────────────────────────────────────────────────────────
  const [company, setCompany] = useState<CompanyData>({
    name: tenant?.name || '',
    country: 'South Africa',
    industry: 'Technology',
  })
  const [sites, setSites] = useState<SiteData[]>([])
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [roles, setRoles] = useState<RoleData[]>([])
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [workRules, setWorkRules] = useState<WorkRules>({ weeklyHoursLimit: 40, overtimeRate: 1.5 })
  const [checkIn, setCheckIn] = useState<CheckInSettings>({
    methods: {
      qrEnabled: true,
      biometricEnabled: false,
      whatsappEnabled: false,
      manualEnabled: false,
      geofencingEnabled: false,
      defaultGeofenceRadius: 200,
    },
  })

  // ── Database Orchestration ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!tenant || !user) return
    setSaving(true)

    try {
      // 1. Insert Sites sequentially so we can extract their generated UUIDs for relationships
      let insertedSites: any[] = []
      if (sites.length > 0) {
        const { data: siteData, error: sitesErr } = await supabase
          .from('sites')
          .insert(
            sites.map((s) => ({
              name: s.name,
              address: s.address,
              geofence_radius_m: parseInt(s.geofence_radius_m || '200'),
              latitude: parseFloat(s.latitude),
              longitude: parseFloat(s.longitude),
              tenant_id: tenant.id,
            }))
          )
          .select()
        if (sitesErr) throw sitesErr
        insertedSites = siteData || []
      }

      // 2. Insert Departments (linked to Sites)
      if (departments.length > 0) {
        const { error: deptErr } = await supabase.from('departments').insert(
          departments.map((d) => ({
            name: d.name,
            site_id: insertedSites[d.site_index]?.id || null,
            tenant_id: tenant.id,
          }))
        )
        if (deptErr) throw deptErr
      }

      // 3. Insert Custom Roles
      if (roles.length > 0) {
        const { error: roleErr } = await supabase.from('organisation_roles').insert(
          roles.map((r) => ({
            name: r.name,
            base_role: r.base_role,
            tenant_id: tenant.id,
          }))
        )
        if (roleErr) throw roleErr
      }

      // 4. Insert Shifts (linked to Sites)
      if (shifts.length > 0) {
        const { error: shiftErr } = await supabase.from('shifts').insert(
          shifts.map((s) => ({
            name: s.name,
            start_time: s.start_time,
            end_time: s.end_time,
            grace_period_minutes: parseInt(s.grace_period_minutes || '0'),
            site_id: insertedSites[s.site_index]?.id,
            tenant_id: tenant.id,
          }))
        )
        if (shiftErr) throw shiftErr
      }

      // 5. Finalize Tenant Onboarding
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          name: company.name,
          country: company.country,
          status: 'active',
          settings: {
            industry: company.industry,
            workRules: workRules,
            checkInMethods: checkIn.methods,
          } as unknown as Json,
        })
        .eq('id', tenant.id)

      if (tenantErr) throw tenantErr

      toast.success('Workspace successfully provisioned!')

      // Hard refresh re-evaluates the Auth0 JWT to drop into the correct AdminDashboard
      window.location.href = '/app'
    } catch (err: any) {
      console.error('Provisioning Error:', err)
      toast.error(err.message || 'Failed to complete configuration.')
    } finally {
      setSaving(false)
    }
  }

  const next = () => setStep((s) => Math.min(s + 1, LAST_STEP))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Workspace Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Setup your multi-tenant environment requirements.
        </p>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6 min-h-100">
          {step === 0 && <CompanyStep data={company} onChange={setCompany} />}
          {step === 1 && <SitesStep data={sites} onChange={setSites} />}
          {step === 2 && (
            <DepartmentsStep data={departments} onChange={setDepartments} sites={sites} />
          )}
          {step === 3 && <RolesStep data={roles} onChange={setRoles} />}
          {step === 4 && (
            <ShiftsStep
              shifts={shifts}
              workRules={workRules}
              sites={sites}
              onShiftsChange={setShifts}
              onWorkRulesChange={setWorkRules}
            />
          )}
          {step === 5 && <CheckInMethodsStep data={checkIn} onChange={setCheckIn} />}
          {step === 6 && (
            <ReviewStep
              company={company}
              sites={sites}
              departments={departments}
              roles={roles}
              shifts={shifts}
              checkInMethods={checkIn}
              workRules={workRules}
            />
          )}
        </CardContent>
      </Card>

      <footer className="flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0 || saving}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step < LAST_STEP ? (
          <Button onClick={next}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        )}
      </footer>
    </div>
  )
}

// ...existing code...

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTenantApi } from '../hooks/useTenantApi'
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

const LAST_STEP = 6

export default function Onboarding() {
  const { tenant, user } = useAuth()
  const { apiFetch } = useTenantApi()

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
      // All provisioning is performed server-side in a single transaction by
      // the permission-gated /api/onboarding/complete endpoint. The server
      // resolves the tenant from the caller's token, inserts sites/departments/
      // roles/shifts with correct UUID linking, and activates the tenant.
      await apiFetch('onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
          company,
          sites,
          departments,
          roles,
          shifts,
          workRules,
          checkInMethods: checkIn.methods,
        }),
      })

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

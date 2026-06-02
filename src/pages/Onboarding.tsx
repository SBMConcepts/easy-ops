import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenantApi } from '../hooks/useTenantApi'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import CompanyStep, { type CompanyData } from '../components/onboarding/CompanyStep'
import SitesStep, { type SiteData } from '../components/onboarding/SitesStep'
import DepartmentsStep, { type DepartmentData } from '../components/onboarding/DepartmentsStep'
import ShiftsStep, { type ShiftData, type WorkRules } from '../components/onboarding/ShiftsStep'
import CheckInMethodsStep, {
  type CheckInSettings,
} from '../components/onboarding/CheckInMethodsStep'
import ReviewStep from '../components/onboarding/ReviewStep'

// 5 Active Steps (0-4) + 1 Review Step (5)
const LAST_STEP = 5

export default function Onboarding() {
  const navigate = useNavigate()
  const { apiFetch } = useTenantApi() // Safe backend connectivity for current workspace
  const { refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Configuration States
  const [company, setCompany] = useState<CompanyData>({ name: '', industry: '', country: '' })
  const [sites, setSites] = useState<SiteData[]>([])
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [workRules, setWorkRules] = useState<WorkRules>({ weeklyHoursLimit: 45, overtimeRate: 1.5 })
  const [checkIn, setCheckIn] = useState<CheckInSettings>({
    methods: {
      qrEnabled: true,
      biometricEnabled: false,
      whatsappEnabled: false,
      manualEnabled: true,
      geofencingEnabled: true,
      defaultGeofenceRadius: 150,
    },
  })

  const next = () => setStep((s) => Math.min(s + 1, LAST_STEP))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    setSaving(true)
    try {
      // Send the entire onboarding bundle to the Express setup controller
      await apiFetch('workspaces/setup', {
        method: 'POST',
        body: JSON.stringify({
          company,
          sites,
          departments,
          shifts,
          workRules,
          checkInSettings: checkIn.methods,
        }),
      })

      toast.success('Workspace profile finalized successfully!')

      // Refresh the local user/tenant context to reflect the new 'active' status
      await refreshProfile()
      navigate('/app', { replace: true })
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : null) || 'Failed saving workspace layout settings.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Workspace Configuration Wizard
          </h1>
          <Progress value={((step + 1) / (LAST_STEP + 1)) * 100} className="h-2" />
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>
              {step === LAST_STEP ? 'Review Configuration' : `Step ${step + 1} of ${LAST_STEP}`}
            </CardTitle>
            <CardDescription>
              {step === LAST_STEP
                ? 'Verify your workspace policies before finalizing.'
                : 'Configure base settings for employee compliance tracks.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-87.5">
            {step === 0 && <CompanyStep data={company} onChange={setCompany} />}
            {step === 1 && <SitesStep data={sites} onChange={setSites} />}
            {step === 2 && (
              <DepartmentsStep data={departments} sites={sites} onChange={setDepartments} />
            )}
            {step === 3 && (
              <ShiftsStep
                shifts={shifts}
                workRules={workRules}
                sites={sites}
                onShiftsChange={setShifts}
                onWorkRulesChange={setWorkRules}
              />
            )}
            {step === 4 && <CheckInMethodsStep data={checkIn} onChange={setCheckIn} />}
            {step === 5 && (
              <ReviewStep
                company={company}
                sites={sites}
                departments={departments}
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
    </div>
  )
}

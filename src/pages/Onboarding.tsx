/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from '../hooks/useOrgApi'
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
import '../styles/onboarding.css'

const LAST_STEP = 6

const STEP_LABELS = ['Company', 'Sites', 'Departments', 'Roles', 'Shifts', 'Methods', 'Review']

export default function Onboarding() {
  const { organization, user } = useAuth()
  const { apiFetch } = useOrgApi()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // ── Form State ─────────────────────────────────────────────────────────────
  const [company, setCompany] = useState<CompanyData>({
    name: organization?.name || '',
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
    if (!organization || !user) return
    setSaving(true)

    try {
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
    <div className="onboarding-page">
      <div className="onboarding-container">
        {/* Header Block with Progress Track */}
        <div className="onboarding-header">
          <h1 className="onboarding-title">Workspace Configuration</h1>
          <p className="onboarding-subtitle">Setup your multi-tenant environment requirements.</p>
          <div className="onboarding-progress">
            <div
              className="onboarding-progress__bar"
              style={{ width: `${(step / LAST_STEP) * 100}%` }}
            />
          </div>
        </div>

        {/* Dynamic Horizontal Steps Indicator */}
        <nav className="onboarding-steps-nav">
          <ul className="onboarding-steps-nav__list">
            {STEP_LABELS.map((label, index) => {
              let statusModifier = 'onboarding-step-btn--upcoming'
              if (index === step) {
                statusModifier = 'onboarding-step-btn--active'
              } else if (index < step) {
                statusModifier = 'onboarding-step-btn--completed'
              }

              return (
                <li key={index}>
                  <button
                    type="button"
                    className={`onboarding-step-btn ${statusModifier}`}
                    onClick={() => index < step && setStep(index)}
                    disabled={index > step}
                  >
                    <span className="onboarding-step-btn__icon">{index + 1}</span>
                    <span className="onboarding-step-btn__label">{label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Content Panel Area */}
        <div className="onboarding-card">
          <div className="onboarding-card__content" style={{ minHeight: '320px' }}>
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
          </div>
        </div>

        {/* Layout Footing Actions */}
        <footer className="onboarding-footer">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.55rem 1.15rem',
              borderRadius: 'var(--onboarding-radius-sm)',
              border: '1px solid var(--onboarding-border)',
              background: 'var(--onboarding-surface)',
              color: 'var(--onboarding-text-primary)',
              cursor: step === 0 || saving ? 'not-allowed' : 'pointer',
              opacity: step === 0 || saving ? 0.5 : 1,
              fontSize: '0.8125rem',
              fontWeight: 500,
              transition: 'var(--onboarding-transition)',
            }}
          >
            <ArrowLeft className="onboarding-btn-icon--left" /> Back
          </button>

          {step < LAST_STEP ? (
            <button
              type="button"
              onClick={next}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--onboarding-radius-sm)',
                border: '1px solid transparent',
                background: 'var(--onboarding-accent)',
                color: 'var(--onboarding-text-primary)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 500,
                transition: 'var(--onboarding-transition)',
              }}
            >
              Next <ArrowRight className="onboarding-btn-icon--right" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--onboarding-radius-sm)',
                border: '1px solid transparent',
                background: 'var(--onboarding-text-primary)',
                color: 'var(--onboarding-surface)',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.75 : 1,
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'var(--onboarding-transition)',
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="onboarding-btn-icon--spin" /> Provisioning...
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

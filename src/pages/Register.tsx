/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgApi } from '../hooks/useOrgApi'
import '../styles/register.css'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import PricingSection, { type PlanId } from '@/components/PricingSection'

const PLAN_NAMES: Record<PlanId, string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

function planFromSearch(value: string | null): PlanId | null {
  return value && value in PLAN_NAMES ? (value as PlanId) : null
}

/** Two-step self-serve signup: company details + plan selection, then admin email to create the org. */
export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { apiFetch } = useOrgApi()
  const requestedPlan = planFromSearch(searchParams.get('plan'))
  const [step, setStep] = useState<1 | 2>(() => (requestedPlan ? 2 : 1))
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(requestedPlan)
  const [form, setForm] = useState({
    companyName: '',
    adminEmail: '',
    mobileNumber: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [invitationSentTo, setInvitationSentTo] = useState<string | null>(null)

  const handleBack = () => {
    if (step === 1) {
      navigate('/login')
    } else {
      setStep(1)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return
    setSubmitting(true)

    try {
      await apiFetch('organizations', {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({
          orgName: form.companyName,
          adminEmail: form.adminEmail,
          mobileNumber: form.mobileNumber.trim() || undefined,
          plan: selectedPlan,
        }),
      })

      toast.success('Workspace provisioned! Check your email for the Admin invitation.')
      setInvitationSentTo(form.adminEmail.trim().toLowerCase())
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="register-page">
      {/* Header: back button + title/subtitle live here, above everything else */}
      <div className="register-header">
        <button type="button" className="register-back-btn" onClick={handleBack}>
          <ArrowLeft size={16} /> {step === 1 ? 'Back' : 'Back to plans'}
        </button>
      </div>

      {invitationSentTo ? (
        <div className="register-content-column">
          <div className="register-card">
            <div className="register-card-content register-invitation-confirmation">
              <MailCheck className="register-invitation-confirmation__icon" aria-hidden="true" />
              <div className="register-flow-header">
                <h2 className="register-flow-title">Check your email</h2>
                <p className="register-flow-desc">
                  We sent the workspace administrator invitation to {invitationSentTo}. Open that
                  email to create your password and continue with workspace setup.
                </p>
              </div>
              <button
                type="button"
                className="register-submit-button"
                onClick={() => navigate('/')}
              >
                Return to home
              </button>
            </div>
          </div>
        </div>
      ) : step === 1 ? (
        <PricingSection
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          onConfirmPlan={() => setStep(2)}
        />
      ) : (
        <div className="register-content-column">
          <div className="register-card">
            <div className="register-card-content">
              <div className="register-flow-header">
                <h2 className="register-flow-title">Create your workspace</h2>
                <p className="register-flow-desc">
                  You will receive an email invitation to set up your workspace and credentials.
                  Paid plans start their 7-day trial after setup and secure payment authorization.
                </p>
              </div>

              {/* Pill displaying the plan selected in Step 1 */}
              <div className="register-selected-plan">
                <span className="register-selected-plan-label">Selected Plan</span>
                <span className="register-selected-plan-name">{PLAN_NAMES[selectedPlan!]}</span>
              </div>

              <form onSubmit={handleRegister} className="register-fields">
                <div className="register-field">
                  <Label className="register-label">Company Name</Label>
                  <Input
                    required
                    type="text"
                    className="register-input"
                    style={{ height: '42px' }}
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </div>

                <div className="register-field">
                  <Label className="register-label">Admin Email</Label>
                  <Input
                    required
                    type="email"
                    className="register-input"
                    style={{ height: '42px' }}
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  />
                </div>

                <div className="register-field">
                  <Label className="register-label">Mobile Number</Label>
                  <Input
                    type="tel"
                    placeholder="+27821234567"
                    className="register-input"
                    style={{ height: '42px' }}
                    value={form.mobileNumber}
                    onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                  />
                </div>

                <button type="submit" className="register-submit-button " disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Create Workspace'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

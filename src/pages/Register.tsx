/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgApi } from '../hooks/useOrgApi'
import '../styles/register.css'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

type BillingPlan = 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'

const PACKAGES: { id: BillingPlan; name: string; price: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R0/mo',
    features: ['Always free', '5 Employees', 'Basic Check-in', 'QR & Manual'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'R299/mo',
    features: ['7-day trial after setup', '35 Employees', 'Basic Check-in', 'QR & Manual'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R799/mo',
    features: ['7-day trial after setup', '70 Employees', 'Geofencing', 'Reports'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R799/mo',
    features: ['7-day trial after setup', '100 Employees', 'Geofencing', 'Reports'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['100+ Employees', 'API Access', 'Custom Roles', 'Priority Support'],
  },
]

/** Two-step self-serve signup: company details + plan selection, then admin email to create the org. */
export default function Register() {
  const navigate = useNavigate()
  const { apiFetch } = useOrgApi()
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    companyName: '',
    adminEmail: '',
    plan: 'starter' as BillingPlan,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleBack = () => {
    if (step === 1) {
      navigate('/login')
    } else {
      setStep(1)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await apiFetch('organizations', {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({
          orgName: form.companyName,
          adminEmail: form.adminEmail,
          plan: form.plan,
        }),
      })

      toast.success('Workspace provisioned! Check your email for the Admin invitation.')
      navigate('/login')
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

        {step === 1 && (
          <div className="register-header-copy">
            <h1 className="register-brand-title">Select your operational capacity</h1>
            <p className="register-brand-subtitle">Choose a plan that fits your workforce size.</p>
          </div>
        )}
      </div>

      {step === 1 ? (
        // Plans render in a grid that spans the full width of the page, independent
        // of the narrower column used for the step-2 form below.
        <div className="register-plans-section">
          <div className="register-plans">
            {PACKAGES.map((pkg) => {
              const isSelected = form.plan === pkg.id
              // Split the price strings into amount and period to use the proper CSS classes
              const priceAmount = pkg.price.includes('/') ? pkg.price.split('/')[0] : pkg.price
              const pricePeriod = pkg.price.includes('/') ? `/${pkg.price.split('/')[1]}` : ''

              return (
                <div
                  key={pkg.id}
                  className={`register-plan-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, plan: pkg.id })}
                >
                  {isSelected && <span className="register-plan-badge">Selected</span>}

                  <div className="register-plan-name">{pkg.name}</div>

                  <div className="register-plan-price">
                    <span className="register-plan-amount">{priceAmount}</span>
                    {pricePeriod && <span className="register-plan-period">{pricePeriod}</span>}
                  </div>

                  <ul className="register-plan-features">
                    {pkg.features.map((f, i) => (
                      <li className="register-plan-feature" key={i}>
                        <Check className="register-plan-feature-icon" size={14} /> {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className="register-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setForm({ ...form, plan: pkg.id })
                      setStep(2)
                    }}
                  >
                    {pkg.name}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
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
                <span className="register-selected-plan-name">
                  {PACKAGES.find((p) => p.id === form.plan)?.name}
                </span>
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

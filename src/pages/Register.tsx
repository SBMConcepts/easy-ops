/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgApi } from '../hooks/useOrgApi'
import '../styles/loginpage.css'

type BillingPlan = 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'

const PACKAGES: { id: BillingPlan; name: string; price: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R0/mo',
    features: ['14 Day Trial', '5 Employees', 'Basic Check-in', 'QR & Manual'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'R299/mo',
    features: ['35 Employees', '', 'Basic Check-in', 'QR & Manual'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R799/mo',
    features: ['70 Employees', 'Geofencing', 'Reports', 'Mobile Check-in'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R799/mo',
    features: ['100 Employees', 'Geofencing', 'Reports', 'Mobile Check-in'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['100+ Employees', 'API Access', 'Custom Roles', 'Priority Support'],
  },
]

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
    <div className="login-page">
      {/* We expand the max-width for Step 1 so the 3 cards have room to breathe */}
      <div className="login-content-column" style={{ maxWidth: step === 1 ? '980px' : '520px' }}>
        {step === 1 ? (
          <div className="login-brand-block">
            <h1 className="login-brand-title">Select your operational capacity</h1>
            <p className="login-brand-subtitle">Choose a plan that fits your workforce size.</p>

            <div className="login-plans mt-6 flex flex-col gap-4 sm:flex-row ">
              {PACKAGES.map((pkg) => {
                const isSelected = form.plan === pkg.id
                // Split the price strings into amount and period to use the proper CSS classes
                const priceAmount = pkg.price.includes('/') ? pkg.price.split('/')[0] : pkg.price
                const pricePeriod = pkg.price.includes('/') ? `/${pkg.price.split('/')[1]}` : ''

                return (
                  <div
                    key={pkg.id}
                    className={`login-plan-card flex-1 ${isSelected ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, plan: pkg.id })}
                  >
                    {isSelected && <span className="login-plan-badge">Selected</span>}

                    <div className="login-plan-name">{pkg.name}</div>

                    <div className="login-plan-price">
                      <span className="login-plan-amount">{priceAmount}</span>
                      {pricePeriod && <span className="login-plan-period">{pricePeriod}</span>}
                    </div>

                    <ul className="login-plan-features mt-4 flex flex-col gap-2 text-sm">
                      {pkg.features.map((f, i) => (
                        <li key={i}>
                          <Check size={14} /> {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      className="login-button mt-4 w-full text-sm font-semibold "
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
          <div className="login-card">
            <div className="login-card-content">
              <button type="button" className="login-back-btn" onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Back to plans
              </button>

              <div className="login-flow-header">
                <h2 className="login-flow-title">Create your workspace</h2>
                <p className="login-flow-desc">
                  You will receive an email invitation to set up your workspace and credentials.
                </p>
              </div>

              {/* Pill displaying the plan selected in Step 1 */}
              <div className="login-selected-plan mb-6">
                <span className="login-selected-plan-label">Selected Plan</span>
                <span className="login-selected-plan-name">
                  {PACKAGES.find((p) => p.id === form.plan)?.name}
                </span>
              </div>

              <form onSubmit={handleRegister} className="login-fields">
                <div className="login-field">
                  <label className="login-label">Company Name</label>
                  {/* Using .login-textarea for standard text inputs inherits the correct borders/focus rings */}
                  <input
                    required
                    type="text"
                    className="login-textarea"
                    style={{ height: '42px' }}
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">Admin Email</label>
                  <input
                    required
                    type="email"
                    className="login-textarea"
                    style={{ height: '42px' }}
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  />
                </div>

                <button type="submit" className="login-button mt-2" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Create Workspace'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

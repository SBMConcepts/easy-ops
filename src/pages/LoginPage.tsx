import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import {
  LogIn,
  Loader2,
  Mail,
  Building2,
  UserPlus,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import '../styles/loginpage.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowMode = 'select' | 'signin' | 'subscribe' | 'request-access'
type SubscribeStep = 'plan' | 'details' | 'confirm'
type RequestStep = 'email' | 'sent'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R299',
    period: '/mo',
    description: 'Up to 25 employees',
    features: ['Attendance tracking', 'Basic reports', '1 site', 'Email support'],
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R799',
    period: '/mo',
    description: 'Up to 100 employees',
    features: ['Everything in Starter', 'Compliance module', '5 sites', 'Priority support'],
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Unlimited employees',
    features: ['Everything in Growth', 'Custom integrations', 'Unlimited sites', 'Dedicated CSM'],
    highlight: false,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calls your backend to:
 *  1. Create an Auth0 org  → get back auth0OrgId
 *  2. Insert tenant row in Supabase (name, plan, auth0OrgId, adminEmail)
 *  3. Send onboarding email to the admin
 *
 * Replace with your real API endpoint.
 */
async function createTenantAndSendOnboarding(payload: {
  orgName: string
  adminEmail: string
  plan: string
}): Promise<{ auth0OrgId: string; tenantId: string }> {
  const res = await fetch('/api/tenants/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to create workspace')
  }
  return res.json()
}

/**
 * Calls your backend to:
 *  1. Check if the email belongs to any Auth0 org / Supabase tenant
 *  2. If not found → email the org's admin asking them to add the user
 *  3. Persist a pending-access record in Supabase
 *
 * Replace with your real API endpoint.
 */
async function requestWorkspaceAccess(payload: { email: string; message?: string }): Promise<void> {
  const res = await fetch('/api/access-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to send request')
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="login-back-btn" aria-label="Go back">
      <ChevronLeft size={14} />
      Back
    </button>
  )
}

// ── Flow A: Email / Password Sign-In ──────────────────────────────────────────

function SignInFlow({
  onBack,
  loginWithCredentials,
}: {
  onBack: () => void
  // email + password are collected here; auth is completed via Auth0 redirect
  loginWithCredentials: (email: string, password: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      // loginWithCredentials calls loginWithRedirect — the page navigates away,
      // so the code below only runs if Auth0 throws before the redirect fires
      // (e.g. network error, misconfigured client).
      await loginWithCredentials(email, password)
    } catch {
      setLoading(false)
      setError('Could not reach the login service. Please try again.')
    }
    // Do NOT setLoading(false) on the happy path — the page is navigating away
  }

  return (
    <div className="login-flow">
      <BackButton onClick={onBack} />
      <div className="login-flow-header">
        <LogIn size={22} className="login-flow-icon" />
        <h2 className="login-flow-title">Sign in to your workspace</h2>
        <p className="login-flow-desc">Enter your work email and password</p>
      </div>

      <div className="login-fields">
        <div className="login-field">
          <label htmlFor="signin-email" className="login-label">
            Work email
          </label>
          <Input
            id="signin-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>
        <div className="login-field">
          <label htmlFor="signin-password" className="login-label">
            Password
          </label>
          <Input
            id="signin-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <Button className="login-button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <LogIn size={16} className="mr-2" />
          )}
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="login-hint">
          Forgot your password?{' '}
          <a href="/reset-password" className="login-link">
            Reset it here
          </a>
        </p>
      </div>
    </div>
  )
}

// ── Flow B: Subscribe & Onboard ───────────────────────────────────────────────

function SubscribeFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<SubscribeStep>('plan')
  const [selectedPlan, setSelectedPlan] = useState<string>('growth')
  const [orgName, setOrgName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePlanNext = () => {
    setStep('details')
  }

  const handleDetailsNext = () => {
    if (!orgName.trim()) {
      setError('Please enter your organisation name.')
      return
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setError('Please enter a valid email.')
      return
    }
    setError('')
    setStep('confirm')
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      await createTenantAndSendOnboarding({ orgName, adminEmail, plan: selectedPlan })
      setStep('confirm') // stays on confirm — state shows success
      setLoading(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  const plan = PLANS.find((p) => p.id === selectedPlan)!

  return (
    <div className="login-flow">
      {step !== 'confirm' || loading ? (
        <BackButton
          onClick={
            step === 'plan' ? onBack : () => setStep(step === 'details' ? 'plan' : 'details')
          }
        />
      ) : null}

      {step === 'plan' && (
        <>
          <div className="login-flow-header">
            <Sparkles size={22} className="login-flow-icon" />
            <h2 className="login-flow-title">Choose your plan</h2>
            <p className="login-flow-desc">You can upgrade or change your plan at any time</p>
          </div>

          <div className="login-plans">
            {PLANS.map((p) => (
              <button
                key={p.id}
                className={`login-plan-card ${selectedPlan === p.id ? 'selected' : ''} ${p.highlight ? 'popular' : ''}`}
                onClick={() => setSelectedPlan(p.id)}
                aria-pressed={selectedPlan === p.id}
              >
                {p.highlight && <span className="login-plan-badge">Most popular</span>}
                <div className="login-plan-name">{p.name}</div>
                <div className="login-plan-price">
                  <span className="login-plan-amount">{p.price}</span>
                  <span className="login-plan-period">{p.period}</span>
                </div>
                <div className="login-plan-desc">{p.description}</div>
                <ul className="login-plan-features">
                  {p.features.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={13} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <Button className="login-button" onClick={handlePlanNext}>
            Continue with {plan.name}
          </Button>
        </>
      )}

      {step === 'details' && (
        <>
          <div className="login-flow-header">
            <Building2 size={22} className="login-flow-icon" />
            <h2 className="login-flow-title">Set up your workspace</h2>
            <p className="login-flow-desc">You'll be the admin of this organisation</p>
          </div>

          <div className="login-fields">
            <div className="login-field">
              <label htmlFor="org-name" className="login-label">
                Organisation name
              </label>
              <Input
                id="org-name"
                type="text"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="login-field">
              <label htmlFor="admin-email" className="login-label">
                Your work email
              </label>
              <Input
                id="admin-email"
                type="email"
                placeholder="you@company.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDetailsNext()}
              />
            </div>
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <div className="login-selected-plan">
              <span className="login-selected-plan-label">Selected plan</span>
              <span className="login-selected-plan-name">
                {plan.name} — {plan.price}
                {plan.period}
              </span>
            </div>

            <Button className="login-button" onClick={handleDetailsNext}>
              Review & confirm
            </Button>
          </div>
        </>
      )}

      {step === 'confirm' && !loading && !error && (
        <div className="login-success">
          <CheckCircle2 size={40} className="login-success-icon" aria-hidden="true" />
          <h2 className="login-flow-title">Check your inbox</h2>
          <p className="login-flow-desc">
            We've sent an onboarding link to <strong>{adminEmail}</strong>. Follow it to complete
            your workspace setup and invite your team.
          </p>
          <div className="login-success-note">
            Your <strong>{plan.name}</strong> workspace is being provisioned. You'll receive a
            second email once your Auth0 organisation is ready.
          </div>
        </div>
      )}

      {step === 'confirm' && !loading && error && (
        <>
          <p className="login-error" role="alert">
            {error}
          </p>
          <Button className="login-button" onClick={handleConfirm}>
            Try again
          </Button>
        </>
      )}

      {step === 'confirm' && loading && (
        <div className="login-loading-state">
          <Loader2 size={28} className="animate-spin login-flow-icon" />
          <p className="login-flow-desc">Provisioning your workspace…</p>
        </div>
      )}
    </div>
  )
}

// ── Flow C: Request Workspace Access ─────────────────────────────────────────

function RequestAccessFlow({ onBack }: { onBack: () => void }) {
  const [reqStep, setReqStep] = useState<RequestStep>('email')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      await requestWorkspaceAccess({ email, message: message || undefined })
      setReqStep('sent')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-flow">
      {reqStep === 'email' && <BackButton onClick={onBack} />}

      {reqStep === 'email' && (
        <>
          <div className="login-flow-header">
            <UserPlus size={22} className="login-flow-icon" />
            <h2 className="login-flow-title">Request workspace access</h2>
            <p className="login-flow-desc">
              Not yet added by your admin? Enter your email and we'll notify them to grant you
              access.
            </p>
          </div>

          <div className="login-fields">
            <div className="login-field">
              <label htmlFor="req-email" className="login-label">
                Your work email
              </label>
              <Input
                id="req-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="login-field">
              <label htmlFor="req-message" className="login-label">
                Message to admin <span className="login-label-optional">(optional)</span>
              </label>
              <textarea
                id="req-message"
                className="login-textarea"
                placeholder="e.g. I'm the new supervisor for the Cape Town branch"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <Button className="login-button" onClick={handleSend} disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Mail size={16} className="mr-2" />
              )}
              {loading ? 'Sending request…' : 'Send access request'}
            </Button>
          </div>
        </>
      )}

      {reqStep === 'sent' && (
        <div className="login-success">
          <CheckCircle2 size={40} className="login-success-icon" aria-hidden="true" />
          <h2 className="login-flow-title">Request sent</h2>
          <p className="login-flow-desc">
            Your administrator has been notified. Once they add you to the workspace you'll receive
            a secure sign-in link at <strong>{email}</strong>.
          </p>
          <div className="login-success-note">
            You don't need to do anything else — we'll email you when access is granted.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main LoginPage ───────────────────────────────────────────────────────────

const LoginPage = () => {
  const { login, loginWithCredentials, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invitation = searchParams.get('invitation')
  const organization = searchParams.get('organization')

  // Derive org identifier from URL params: prefer explicit ?organization= query param (e.g. from an Auth0 invitation link), but fall back to subdomain for backwards compatibility with existing links.
  const orgId = organization || undefined

  const [mode, setMode] = useState<FlowMode>('select')

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/app', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  // If arriving via an Auth0 invitation link, skip straight to sign-in
  useEffect(() => {
    if (invitation) {
      login({ auth0OrgId: orgId, invitation })
    }
  }, [invitation, orgId, login])

  // Wrapper so SignInFlow can call Auth0 username/password
  const handleCredentialLogin = async (email: string, password: string) => {
    await loginWithCredentials({ email, password, auth0OrgId: orgId })
  }

  if (isLoading || invitation) {
    return (
      <div className="login-page">
        <div className="login-content-column">
          <div className="login-brand-block">
            <h1 className="login-brand-title">EasyOps</h1>
            <p className="login-brand-subtitle">Workforce Management Platform</p>
          </div>
          <div className="login-loading-state" style={{ marginTop: '2rem' }}>
            <Loader2 size={28} className="animate-spin login-flow-icon" />
            <p className="login-flow-desc">
              {invitation ? 'Accepting invitation…' : 'Verifying workspace…'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-content-column">
        <div className="login-brand-block">
          <h1 className="login-brand-title">EasyOps</h1>
          <p className="login-brand-subtitle">Workforce Management Platform</p>
        </div>

        <Card className="login-card">
          <CardContent className="login-card-content" style={{ paddingTop: '1.5rem' }}>
            {/* ── Mode selector ── */}
            {mode === 'select' && (
              <>
                <CardHeader
                  className="login-card-header"
                  style={{ padding: 0, marginBottom: '1.5rem' }}
                >
                  <CardTitle className="login-card-title">Welcome back</CardTitle>
                  <CardDescription className="login-card-description">
                    How would you like to continue?
                  </CardDescription>
                </CardHeader>

                <div className="login-mode-grid">
                  <button className="login-mode-btn" onClick={() => setMode('signin')}>
                    <LogIn size={20} aria-hidden="true" className="login-mode-icon" />
                    <span className="login-mode-label">Sign in</span>
                    <span className="login-mode-sub">I have a workspace account</span>
                  </button>

                  <button
                    className="login-mode-btn login-mode-btn--featured"
                    onClick={() => setMode('subscribe')}
                  >
                    <Sparkles size={20} aria-hidden="true" className="login-mode-icon" />
                    <span className="login-mode-label">Subscribe</span>
                    <span className="login-mode-sub">
                      Create a new workspace for my organisation
                    </span>
                  </button>

                  <button className="login-mode-btn" onClick={() => setMode('request-access')}>
                    <UserPlus size={20} aria-hidden="true" className="login-mode-icon" />
                    <span className="login-mode-label">Request access</span>
                    <span className="login-mode-sub">I haven't been added by my admin yet</span>
                  </button>
                </div>
              </>
            )}

            {/* ── Sub-flows ── */}
            {mode === 'signin' && (
              <SignInFlow
                onBack={() => setMode('select')}
                loginWithCredentials={handleCredentialLogin}
              />
            )}
            {mode === 'subscribe' && <SubscribeFlow onBack={() => setMode('select')} />}
            {mode === 'request-access' && <RequestAccessFlow onBack={() => setMode('select')} />}
          </CardContent>
        </Card>

        <p
          className="login-footer-text"
          style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', opacity: 0.6 }}
        >
          EasyOps is invite-only for employees. Administrators register their organisations above.
        </p>
      </div>
    </div>
  )
}

export default LoginPage

import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom' // Dropped useParams
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { LogIn, Loader2, UserPlus, ChevronLeft, Sparkles } from 'lucide-react'
import '../styles/loginpage.css'

// Types and constants stay exactly identical
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

// Helper wrappers connect straight to your Supabase proxy clients
async function createTenantAndSendOnboarding(payload: {
  orgName: string
  adminEmail: string
  plan: string
}) {
  const base = import.meta.env.VITE_API_URL ?? ''
  const res = await fetch(`${base}/api/tenants/create`, {
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

async function requestWorkspaceAccess(payload: { email: string; message?: string }) {
  const base = import.meta.env.VITE_API_URL ?? ''
  const res = await fetch(`${base}/api/access-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to send request')
  }
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="login-back-btn" aria-label="Go back">
      <ChevronLeft size={14} />
      Back
    </button>
  )
}

// Flow components remain completely uncoupled from slugs
function SignInFlow({
  onBack,
  loginWithCredentials,
}: {
  onBack: () => void
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
      await loginWithCredentials(email, password)
    } catch {
      setLoading(false)
      setError('Could not reach the login service. Please try again.')
    }
  }

  return (
    <div className="login-flow">
      <BackButton onClick={onBack} />
      <div className="login-flow-header">
        <LogIn size={22} className="login-flow-icon" />
        <h2 className="login-flow-title">Sign in</h2>
      </div>
      <div className="login-fields">
        <div className="login-field">
          <label className="login-label">Work email</label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>
        <div className="login-field">
          <label className="login-label">Password</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        {error && <p className="login-error">{error}</p>}
        <Button className="login-button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <LogIn size={16} className="mr-2" />
          )}
          Sign in
        </Button>
      </div>
    </div>
  )
}

function SubscribeFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<SubscribeStep>('plan')
  const [selectedPlan, setSelectedPlan] = useState<string>('growth')
  const [orgName, setOrgName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePlanNext = () => setStep('details')
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
      setStep('confirm')
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
            <h2 className="login-flow-title">Choose plan</h2>
          </div>
          <div className="login-plans">
            {PLANS.map((p) => (
              <button
                key={p.id}
                className={`login-plan-card ${selectedPlan === p.id ? 'selected' : ''}`}
                onClick={() => setSelectedPlan(p.id)}
              >
                {p.name} - {p.price}
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
          <div className="login-fields">
            <div className="login-field">
              <Input
                type="text"
                placeholder="Organisation Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="login-field">
              <Input
                type="email"
                placeholder="Your Email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <Button className="login-button" onClick={handleDetailsNext}>
              Review & confirm
            </Button>
          </div>
        </>
      )}
      {step === 'confirm' && (
        <div className="login-success">Workspace setup instruction dispatched to your inbox.</div>
      )}
    </div>
  )
}

function RequestAccessFlow({ onBack }: { onBack: () => void }) {
  const [reqStep, setReqStep] = useState<RequestStep>('email')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
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
      {reqStep === 'email' ? (
        <div className="login-fields">
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button className="login-button" onClick={handleSend} disabled={loading}>
            Send access request
          </Button>
        </div>
      ) : (
        <div className="login-success">Request flagged for Admin approval.</div>
      )}
    </div>
  )
}

// ─── Main LoginPage (Slug-Free Compilation) ──────────────────────────────────
const LoginPage = () => {
  const { login, loginWithCredentials, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invitation = searchParams.get('invitation')
  const organization = searchParams.get('organization')

  // Slug parsing logic completely removed. We explicitly trace organization query context hooks.
  const orgId = organization || undefined
  const [mode, setMode] = useState<FlowMode>('select')

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/app', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (invitation) {
      login({ auth0OrgId: orgId, invitation })
    }
  }, [invitation, orgId, login])

  const handleCredentialLogin = async (email: string, password: string) => {
    await loginWithCredentials({ email, password, auth0OrgId: orgId })
  }

  if (isLoading || invitation) {
    return (
      <div className="login-page">
        <div className="login-loading-state">
          <Loader2 size={28} className="animate-spin login-flow-icon" />
          <p className="login-flow-desc">
            {invitation ? 'Accepting invitation…' : 'Verifying account status…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-content-column">
        <Card className="login-card">
          <CardContent className="login-card-content" style={{ paddingTop: '1.5rem' }}>
            {mode === 'select' && (
              <>
                <CardHeader
                  className="login-card-header"
                  style={{ padding: 0, marginBottom: '1.5rem' }}
                >
                  <CardTitle className="login-card-title">Welcome to EasyOps</CardTitle>
                </CardHeader>
                <div className="login-mode-grid">
                  <button className="login-mode-btn" onClick={() => setMode('signin')}>
                    <LogIn size={20} className="login-mode-icon" />
                    <span className="login-mode-label">Sign in</span>
                  </button>
                  <button className="login-mode-btn" onClick={() => setMode('subscribe')}>
                    <Sparkles size={20} className="login-mode-icon" />
                    <span className="login-mode-label">Subscribe</span>
                  </button>
                  <button className="login-mode-btn" onClick={() => setMode('request-access')}>
                    <UserPlus size={20} className="login-mode-icon" />
                    <span className="login-mode-label">Request access</span>
                  </button>
                </div>
              </>
            )}
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
      </div>
    </div>
  )
}

export default LoginPage

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { LogIn, Loader2, Sparkles, UserPlus } from 'lucide-react'
import BrandFull from '../assets/EasyOps Brand Logo and Name.png'
import '../styles/loginpage.css'

const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const invitation = searchParams.get('invitation')
  const orgId = searchParams.get('organization') // Auth0 sends the org ID as 'organization' in the query params

  useEffect(() => {
    // Escalate to dashboard automatically if session exists
    if (!isLoading && isAuthenticated) navigate('/app', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    // Catch inbound Auth0 invitation links and pass them natively into the Context provider
    if (invitation) login({ auth0OrgId: orgId ?? undefined, invitation })
  }, [invitation, orgId, login])

  if (isLoading || invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <Loader2 size={36} className="animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground font-medium">
            {invitation
              ? 'Accepting secure workspace invitation…'
              : 'Verifying system authorizations…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-content-column">
        <Card className="login-card">
          <CardHeader className="login-card-header">
            <img className="login-card-logo" src={BrandFull} alt="EasyOps" />
            <p className="login-card-description">Secure Workspace Authentication</p>
          </CardHeader>

          <CardContent className="login-card-content">
            <div className="login-mode-grid">
              {/* Top Option: Existing User Login */}
              <button
                onClick={() =>
                  login({ auth0OrgId: orgId ?? undefined, invitation: invitation ?? undefined })
                }
                className="login-mode-btn login-mode-btn--featured"
              >
                <LogIn className="login-mode-icon" size={24} />
                <span className="login-mode-label">Sign In</span>
                <span className="login-mode-sub">Access your existing EasyOps workspace</span>
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-black/10 " />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-3  text-[#888780] font-medium">New to EasyOps?</span>
                </div>
              </div>

              {/* Option 2: Subscribe & Register */}
              <button onClick={() => navigate('/register')} className="login-mode-btn">
                <Sparkles className="login-mode-icon" size={24} />
                <span className="login-mode-label">Sign Up</span>
                <span className="login-mode-sub">Sign up for a new EasyOps workspace</span>
              </button>

              {/* Option 3: Request Access */}
              <button onClick={() => navigate('/get-started')} className="login-mode-btn">
                <UserPlus className="login-mode-icon" size={24} />
                <span className="login-mode-label">Request Access</span>
                <span className="login-mode-sub">
                  Ask your admin for an email or phone invitation
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage

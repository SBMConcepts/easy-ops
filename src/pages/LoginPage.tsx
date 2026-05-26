import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom' // <-- Added useSearchParams
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { LogIn, Loader2 } from 'lucide-react'
import '../styles/loginpage.css'

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const { tenant, isLoading: tenantLoading, isCustomSubdomain, resolveTenant } = useTenant()
  const navigate = useNavigate()

  // 1. Extract Auth0 invitation parameters from the URL
  const [searchParams] = useSearchParams()
  const invitation = searchParams.get('invitation')
  const organization = searchParams.get('organization')

  // Automatically resolve the tenant information if accessed via an organization subdomain
  useEffect(() => {
    if (isCustomSubdomain) {
      resolveTenant()
    }
  }, [isCustomSubdomain, resolveTenant])

  // Route user directly inside if they are already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/app', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleLogin = () => {
    // 2. Resolve the target organization (URL parameter overrides local tenant context)
    const targetOrgId = organization || tenant?.auth0OrgId || undefined

    // 3. Pass both the organization ID and the invitation ticket to your login handler
    login({
      auth0OrgId: targetOrgId,
      invitation: invitation || undefined,
    })
  }

  const isBusy = isLoading || tenantLoading

  return (
    <div className="login-page">
      <div className="login-content-column">
        <div className="login-brand-block">
          <h1 className="login-brand-title">EasyOps</h1>
          <p className="login-brand-subtitle">Workforce Management Platform</p>
        </div>

        <Card className="login-card">
          <CardHeader className="login-card-header">
            {/* 4. Update the UI conditionally if an invite is detected */}
            <CardTitle className="login-card-title">
              {invitation ? 'Accept Invitation' : 'Sign In'}
            </CardTitle>
            <CardDescription className="login-card-description">
              {invitation
                ? 'You have been invited to join a workspace.'
                : 'Sign in to your isolated company workspace'}
            </CardDescription>
          </CardHeader>

          <CardContent className="login-card-content">
            <Button className="login-button" onClick={handleLogin} disabled={isBusy}>
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {isBusy
                ? 'Verifying Workspace…'
                : invitation
                  ? 'Accept Invite & Continue'
                  : 'Continue to Sign In'}
            </Button>

            <div className="login-footer">
              <p className="login-footer-text">
                EasyOps is invite-only. Staff members receive secure registration links from their
                workspace administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage

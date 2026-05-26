import { useEffect } from 'react'
import { useNavigate } from 'react-router'
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
            <CardTitle className="login-card-title">Sign In</CardTitle>
            <CardDescription className="login-card-description">
              Sign in to your isolated company workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="login-card-content">
            <Button
              className="login-button"
              onClick={() => login(tenant?.auth0OrgId ?? undefined)} // Securely passes organization token metadata
              disabled={isBusy}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {isBusy ? 'Verifying Workspace…' : 'Continue to Sign In'}
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

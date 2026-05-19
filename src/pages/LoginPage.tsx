import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { LogIn, Loader2 } from 'lucide-react'
import '../styles/loginpage.css'

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // If the user is already authenticated (e.g. they navigated to /login
  // manually while logged in), send them to the app immediately.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/app', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="login-page">
      <div className="login-content-column">
        {/* Brand */}
        <div className="login-brand-block">
          <h1 className="login-brand-title">EasyOps</h1>
          <p className="login-brand-subtitle">Workforce Management Platform</p>
        </div>

        {/* Card */}
        <Card className="login-card">
          <CardHeader className="login-card-header">
            <CardTitle className="login-card-title">Sign In</CardTitle>
            <CardDescription className="login-card-description">
              Sign in to your EasyOps account
            </CardDescription>
          </CardHeader>

          <CardContent className="login-card-content">
            <Button className="login-button" onClick={() => login()} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogIn className="h-3 w-3" />
              )}
              {isLoading ? 'Redirecting…' : 'Continue to Sign In'}
            </Button>

            <div className="login-footer">
              <p className="login-footer-text">
                EasyOps is invite-only. Companies are onboarded by an EasyOps administrator.
                Employees receive an invitation email from their company admin.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage

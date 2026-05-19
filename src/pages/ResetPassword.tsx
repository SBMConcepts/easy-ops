import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { KeyRound, LogIn } from 'lucide-react'
import '../styles/resetpassword.css'

/**
 * With Auth0, password reset is handled entirely by the Auth0 Universal Login
 * page (the "Forgot Password" link on the hosted login form). This page acts
 * as a fallback entry-point for users who land on /reset-password directly
 * and redirects them to the Auth0 login flow where they can trigger a reset.
 */
const ResetPassword = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  return (
    <div className="reset-page">
      <div className="reset-content-column">
        {/* Brand */}
        <div className="reset-brand-block">
          <h1 className="reset-brand-title">EasyOps</h1>
        </div>

        {/* Card */}
        <Card className="reset-card">
          <CardHeader className="reset-card-header">
            <CardTitle className="reset-card-title">Reset Password</CardTitle>
            <CardDescription className="reset-card-description">
              Use the "Forgot password?" link on the sign-in page to reset your password securely
              via Auth0.
            </CardDescription>
          </CardHeader>

          <CardContent className="reset-card-content">
            <Button className="reset-button" onClick={() => login()}>
              <KeyRound className="h-3 w-3" />
              Go to Sign In
            </Button>

            <button type="button" className="reset-back-link" onClick={() => navigate('/')}>
              <LogIn className="h-3 w-3" />
              Back to Home
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword

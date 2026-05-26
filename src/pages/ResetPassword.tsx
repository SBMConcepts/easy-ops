import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { KeyRound, LogIn } from 'lucide-react'
import '../styles/resetpassword.css'

const ResetPassword = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  return (
    <div className="reset-page">
      <div className="reset-content-column">
        <div className="reset-brand-block">
          <h1 className="reset-brand-title">EasyOps</h1>
        </div>

        <Card className="reset-card">
          <CardHeader className="reset-card-header">
            <CardTitle className="reset-card-title">Reset Password</CardTitle>
            <CardDescription className="reset-card-description">
              Password management is securely handled via Auth0. Click the "Forgot password?" option
              directly on the identity sign-in interface.
            </CardDescription>
          </CardHeader>

          <CardContent className="reset-card-content">
            <Button className="reset-button" onClick={() => login()}>
              <KeyRound className="h-4 w-4 mr-2" />
              Return to Sign In
            </Button>

            <button type="button" className="reset-back-link" onClick={() => navigate('/')}>
              <LogIn className="h-3 w-3 mr-1" />
              Back to Home
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword

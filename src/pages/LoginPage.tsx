import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { toast } from 'sonner'
import { LogIn } from 'lucide-react'
import '../styles/loginpage.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const success = await login(email, password)
    setLoading(false)
    if (success) {
      toast.success('Welcome to EasyOps!')
      navigate('/app')
    } else {
      toast.error('Invalid credentials.')
    }
  }

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
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="login-card-content">
            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field-group">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="login-field-group">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="login-button" disabled={loading}>
                <LogIn className="h-3 w-3 " />
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>

              <Button
                type="button"
                className="login-forgot-link"
                onClick={() => navigate('/reset-password', { state: { email } })}
              >
                Forgot password?
              </Button>
            </form>

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

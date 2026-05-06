import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { toast } from 'sonner'
import { KeyRound, LogIn } from 'lucide-react'
import '../styles/resetpassword.css'

const ResetPassword = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string })?.email ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message || 'Could not update password.')
      return
    }
    toast.success('Password updated! Redirecting…')
    navigate('/app')
  }

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
              Choose a new password for your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="reset-card-content">
            <form onSubmit={handleSubmit} className="reset-form">
              {email && (
                <div className="reset-field-group">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    className="bg-muted cursor-default"
                  />
                </div>
              )}

              <div className="reset-field-group">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="reset-field-group">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="reset-button" disabled={loading}>
                <KeyRound className="h-3 w-3 " />
                {loading ? 'Saving…' : 'Reset Password'}
              </Button>
            </form>

            <button type="button" className="reset-back-link" onClick={() => navigate('/login')}>
              <LogIn className="h-3 w-3" />
              Back to Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { KeyRound, LogIn, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import '../styles/resetpassword.css'

const ResetPassword = () => {
  const navigate = useNavigate()

  // Two flows: request a reset email, or — when the user arrives from a recovery
  // / invite link — set a new password against the recovery session Supabase
  // establishes from the URL.
  const [mode, setMode] = useState<'request' | 'update'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // detectSessionInUrl exchanges the recovery/invite link for a session and
    // emits PASSWORD_RECOVERY; switch to the set-password form when that lands.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update')
    })
    // An invite link signs the user in directly; offer the set-password form too.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes('type=')) setMode('update')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return toast.error('Enter your email.')
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSubmitting(false)
    if (error) return toast.error(error.message)
    toast.success('Check your email for a password reset link.')
  }

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters.')
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) return toast.error(error.message)
    toast.success('Password updated. You can now sign in.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="reset-page">
      <div className="reset-content-column">
        <div className="reset-brand-block">
          <h1 className="reset-brand-title">EasyOps</h1>
        </div>

        <Card className="reset-card">
          <CardHeader className="reset-card-header">
            <CardTitle className="reset-card-title">
              {mode === 'update' ? 'Set a New Password' : 'Reset Password'}
            </CardTitle>
            <CardDescription className="reset-card-description">
              {mode === 'update'
                ? 'Choose a new password for your account.'
                : 'Enter your email and we’ll send you a secure link to reset your password.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="reset-card-content">
            {mode === 'update' ? (
              <form onSubmit={updatePassword} className="w-full space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="reset-button" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Update Password
                </Button>
              </form>
            ) : (
              <form onSubmit={requestReset} className="w-full space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <Button type="submit" className="reset-button" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Send Reset Link
                </Button>
              </form>
            )}

            <button type="button" className="reset-back-link" onClick={() => navigate('/login')}>
              <LogIn className="h-3 w-3 mr-1" />
              Back to Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword

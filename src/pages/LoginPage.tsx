import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { LogIn, Loader2, Sparkles, UserPlus } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-extrabold tracking-tight">EasyOps</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Secure Workspace Authentication</p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Button
              onClick={() => login({ auth0OrgId: orgId ?? undefined })}
              className="w-full h-12 text-md font-semibold"
            >
              <LogIn className="mr-2 h-5 w-5" /> Proceed to Login
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">New to EasyOps?</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => navigate('/register')}
              >
                <Sparkles className="mr-2 h-4 w-4 text-secondary" /> Subscribe
              </Button>
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => navigate('/get-started')}
              >
                <UserPlus className="mr-2 h-4 w-4 text-primary" /> Request Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage

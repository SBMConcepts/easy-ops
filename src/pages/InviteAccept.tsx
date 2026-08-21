import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useOrgApi } from '../hooks/useOrgApi'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Loader2, LogIn } from 'lucide-react'
import '../styles/inviteaccept.css'

interface InvitationLookup {
  auth0_org_id: string
  org_name: string
  email: string | null
  phone_number: string | null
}

/** Landing page for SMS-delivered phone invitations; resolves the token then hands off to Auth0 signup for that organization. */
const InviteAccept = () => {
  const { token } = useParams<{ token: string }>()
  const { login } = useAuth()
  const { apiFetch } = useOrgApi()
  const [invitation, setInvitation] = useState<InvitationLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('This invitation link is missing its token.')
      setLoading(false)
      return
    }

    apiFetch<InvitationLookup>(`invitations/token/${encodeURIComponent(token)}`, {
      requireAuth: false,
    })
      .then(setInvitation)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'This invitation link is invalid or has expired.'
        )
      })
      .finally(() => setLoading(false))
  }, [apiFetch, token])

  return (
    <div className="reset-page">
      <div className="reset-content-column">
        <div className="reset-brand-block">
          <h1 className="reset-brand-title">EasyOps</h1>
        </div>

        <Card className="reset-card">
          <CardHeader className="reset-card-header">
            <CardTitle className="reset-card-title">You're invited</CardTitle>
            <CardDescription className="reset-card-description">
              {loading
                ? 'Checking your invitation…'
                : error
                  ? error
                  : `Join ${invitation?.org_name} on EasyOps to finish setting up your account.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="reset-card-content">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Button
                className="reset-button"
                disabled={!!error || !invitation}
                onClick={() => invitation && login({ auth0OrgId: invitation.auth0_org_id })}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Continue to sign up
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default InviteAccept

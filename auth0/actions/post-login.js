/**
 * Auth0 Action: Post-Login
 * Trigger: Login / Post Login
 *
 * Responsibilities:
 *  1. Attach custom claims (role, org_id) to both the ID token and access token
 *     so the frontend AuthContext and the Express verifyAuth0Token() can read them.
 *  2. Call POST /api/auth/sync on every login to keep the Supabase public.users
 *     row up to date (email, avatar, name).
 *
 * Required Secrets (set in Auth0 Dashboard → Actions → Secrets):
 *   API_BASE_URL       — e.g. https://api.easy-ops-za.vercel.app
 *   AUTH0_SYNC_SECRET  — must match process.env.AUTH0_SYNC_SECRET on your server
 */

const CLAIM_NS = 'https://easy-ops-za.vercel.app/'

exports.onExecutePostLogin = async (event, api) => {
  // 1. Attach org_id claim
  const orgId = event.organization && event.organization.id ? event.organization.id : null
  if (orgId) {
    api.idToken.setCustomClaim(CLAIM_NS + 'org_id', orgId)
    api.accessToken.setCustomClaim(CLAIM_NS + 'org_id', orgId)
  }

  // 2. Attach role claim
  const role =
    event.user.app_metadata && event.user.app_metadata.role
      ? event.user.app_metadata.role
      : 'employee'
  api.idToken.setCustomClaim(CLAIM_NS + 'role', role)
  api.accessToken.setCustomClaim(CLAIM_NS + 'role', role)

  // 3. Sync user row to Supabase (fire-and-forget — never blocks login)
  const apiBaseUrl = event.secrets && event.secrets.API_BASE_URL
  const syncSecret = event.secrets && event.secrets.AUTH0_SYNC_SECRET

  if (!apiBaseUrl || !syncSecret) {
    console.warn('[post-login] API_BASE_URL or AUTH0_SYNC_SECRET not set — skipping sync')
    return
  }

  try {
    const res = await fetch(apiBaseUrl + '/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': syncSecret,
      },
      body: JSON.stringify({
        auth0UserId: event.user.user_id,
        email: event.user.email,
        name: event.user.name || event.user.email,
        avatarUrl: event.user.picture || null,
        emailVerified: event.user.email_verified || false,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(function () {
        return ''
      })
      console.error('[post-login] Sync failed: ' + res.status + ' ' + text)
    }
  } catch (err) {
    console.error('[post-login] Sync fetch error:', err && err.message ? err.message : err)
  }
}

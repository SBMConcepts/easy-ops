/**
 * Auth0 Action: Account Linking
 * Trigger: Login / Post Login — place BEFORE post-login.js in the flow.
 *
 * When someone signs in with Google using an email that already belongs to a
 * custom-database (`auth0|…`) user, link the Google identity onto that user so
 * the `sub` stays `auth0|<id>` and no duplicate account is created.
 *
 * Links only when BOTH emails are verified, otherwise an attacker could claim
 * a victim's account with an unverified address.
 *
 * Required Secrets: AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET
 * (Management API: read:users, update:users).
 */

exports.onExecutePostLogin = async (event, api) => {
  const user = event.user
  const identity = user.identities && user.identities[0]

  // Already linked (primary has >1 identity), database login, or no verified email.
  if (!identity || identity.provider !== 'google-oauth2') return
  if ((user.identities || []).length > 1) return
  if (!user.email || user.email_verified !== true) return

  const domain = event.secrets.AUTH0_DOMAIN
  const clientId = event.secrets.AUTH0_M2M_CLIENT_ID
  const clientSecret = event.secrets.AUTH0_M2M_CLIENT_SECRET
  if (!domain || !clientId || !clientSecret) {
    console.warn('[account-linking] Management API secrets not set — skipping')
    return
  }

  try {
    const tokenRes = await fetch('https://' + domain + '/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: 'https://' + domain + '/api/v2/',
      }),
    })
    const { access_token: token } = await tokenRes.json()
    if (!token) return

    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }

    const lookup = await fetch(
      'https://' + domain + '/api/v2/users-by-email?email=' + encodeURIComponent(user.email),
      { headers }
    )
    const matches = await lookup.json()
    if (!Array.isArray(matches)) return

    const primary = matches.find(function (u) {
      return u.user_id !== user.user_id && u.email_verified === true && /^auth0\|/.test(u.user_id)
    })
    if (!primary) return

    const link = await fetch(
      'https://' + domain + '/api/v2/users/' + encodeURIComponent(primary.user_id) + '/identities',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider: identity.provider, user_id: identity.user_id }),
      }
    )
    if (!link.ok) {
      console.error('[account-linking] Link failed: ' + link.status)
      return
    }

    api.authentication.setPrimaryUser(primary.user_id)
  } catch (err) {
    console.error('[account-linking] error:', err && err.message ? err.message : err)
  }
}

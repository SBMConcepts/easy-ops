/**
 * Auth0 Action: Post-Login
 * Trigger: Login / Post Login
 *
 * Responsibilities:
 *  1. Call POST /api/auth/sync on every login to keep the Supabase public.users
 *     row up to date (email, avatar, name) AND to resolve the AUTHORITATIVE
 *     role + org_id + permissions from the database (org_members.role and
 *     role_permissions are the source of truth — app_metadata is not reliable
 *     on a custom-database connection).
 *  2. Inject the DB-resolved role, org_id and permissions as namespaced claims
 *     on both the ID token and access token so the frontend AuthContext and the
 *     Express verifyAuth0Token() gate on identical, login-fresh data.
 *
 * Required Secrets (set in Auth0 Dashboard → Actions → Secrets):
 *   BACKEND_URL        — Your Express server: https://api.easyops.co.za
 *   AUTH0_SYNC_SECRET  — must match process.env.AUTH0_SYNC_SECRET on your server
 */

const CLAIM_NS = 'https://easy-ops-za.vercel.app/'

exports.onExecutePostLogin = async (event, api) => {
  // The login org, if this was an Organization-scoped login. Passed to the sync
  // endpoint so it resolves the membership/role in THIS tenant.
  const orgIdFromLogin = event.organization && event.organization.id

  // Fallback role from app_metadata. On a custom-database connection this is not
  // a reliable carrier of the role across logins, so it is only used when the DB
  // sync yields nothing (e.g. first login before tenant provisioning).
  const fallbackRole =
    (event.user.app_metadata && event.user.app_metadata.role) || event.user.app_metadata.role

  // 1. Sync the Supabase users row and resolve the AUTHORITATIVE role + org_id
  //    + permissions from the database (source of truth: org_members.role and
  //    role_permissions). The claims are injected from the response below.
  const backendUrl = event.secrets && event.secrets.BACKEND_URL
  const syncSecret = event.secrets && event.secrets.AUTH0_SYNC_SECRET

  let role = fallbackRole
  let orgId = orgIdFromLogin
  let permissions = []

  if (!backendUrl || !syncSecret) {
    console.warn('[post-login] BACKEND_URL or AUTH0_SYNC_SECRET not set — using fallback role/org')
  } else {
    try {
      const res = await fetch(backendUrl + '/api/auth/sync', {
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
          role: fallbackRole,
          orgId: orgIdFromLogin,
        }),
      })
      if (res.ok) {
        const data = await res.json().catch(function () {
          return null
        })
        if (data) {
          if (data.role) role = data.role
          if (data.orgId) orgId = data.orgId
          if (Array.isArray(data.permissions)) permissions = data.permissions
        }
      } else {
        const text = await res.text().catch(function () {
          return ''
        })
        console.error('[post-login] Sync failed: ' + res.status + ' ' + text)
      }
    } catch (err) {
      console.error('[post-login] Sync fetch error:', err && err.message ? err.message : err)
    }
  }

  // 2. Inject claims (DB-authoritative when the sync succeeded) on both tokens
  //    so the frontend AuthContext and the Express verifyAuth0Token() agree.
  api.idToken.setCustomClaim(CLAIM_NS + 'role', role)
  api.accessToken.setCustomClaim(CLAIM_NS + 'role', role)

  if (orgId) {
    api.idToken.setCustomClaim(CLAIM_NS + 'org_id', orgId)
    api.accessToken.setCustomClaim(CLAIM_NS + 'org_id', orgId)
  }

  api.idToken.setCustomClaim(CLAIM_NS + 'permissions', permissions)
  api.accessToken.setCustomClaim(CLAIM_NS + 'permissions', permissions)
}

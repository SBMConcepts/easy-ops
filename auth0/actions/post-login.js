/**
 * Auth0 Action: Post-Login
 * Trigger: Login / Post Login
 *
 * Responsibilities:
 *  1. Call POST /api/auth/sync on every login to keep the Supabase public.users
 *     row up to date (email, avatar, name) AND to resolve the AUTHORITATIVE
 *     access tier from the database (org_members.role is the source of truth —
 *     app_metadata is not reliable on a custom-database connection).
 *  2. Inject the DB-resolved role + org_id as namespaced claims on both the ID
 *     token and access token so the frontend AuthContext and the Express
 *     verifyAuth0Token() gate on identical, login-fresh data.
 *
 * NOTE: does NOT inject a `permissions` claim. Express re-derives permissions
 * from org_members.role via the DB on every request (requirePermission), and
 * the frontend gets its permission list from /api/userinfo — neither reads it
 * off a token. Adding it back would bloat the ID token past the session
 * cookie's safe size (express-openid-connect stores the whole ID token in the
 * session cookie; a large `permissions` array here has previously pushed that
 * over the ~4KB cookie limit and made otherwise-valid sessions look
 * unauthenticated).
 */

const jwt = require('jsonwebtoken')

const CLAIM_NS = 'https://easyops.us.auth0.com/'

exports.onExecutePostLogin = async (event, api) => {
  const orgIdFromLogin = event.organization && event.organization.id

  const fallbackRole = event.user.app_metadata && event.user.app_metadata.role

  const backendUrl = event.secrets && event.secrets.BACKEND_URL
  const syncSecret = event.secrets && event.secrets.AUTH0_SYNC_SECRET

  let role = fallbackRole
  const orgId = orgIdFromLogin

  if (!backendUrl || !syncSecret) {
    console.warn('[post-login] BACKEND_URL or AUTH0_SYNC_SECRET not set — using fallback role/org')
  } else {
    try {
      const res = await fetch(backendUrl + '/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': syncSecret,
        },
        body: JSON.stringify({
          auth0_user_id: event.user.user_id,
          email: event.user.email,
          full_name: event.user.name || event.user.email,
          avatar_url: event.user.picture || null,
          auth0_org_id: orgIdFromLogin,
          role: fallbackRole,
        }),
      })
      if (res.ok) {
        const data = await res.json().catch(function () {
          return null
        })
        if (data && data.role) role = data.role
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

  if (role) {
    api.idToken.setCustomClaim(CLAIM_NS + 'role', role)
    api.accessToken.setCustomClaim(CLAIM_NS + 'role', role)
  }

  if (orgId) {
    api.idToken.setCustomClaim(CLAIM_NS + 'auth0_org_id', orgId)
    api.accessToken.setCustomClaim(CLAIM_NS + 'auth0_org_id', orgId)
  }

  const supabaseJwtSecret = event.secrets && event.secrets.SUPABASE_JWT_SECRET
  if (!supabaseJwtSecret) {
    console.warn('[post-login] SUPABASE_JWT_SECRET not set — skipping supabase_jwt mint')
  } else {
    const nowSec = Math.floor(Date.now() / 1000)
    const supabaseJwt = jwt.sign(
      {
        sub: event.user.user_id,
        email: event.user.email,
        aud: 'authenticated',
        role: 'authenticated',
        auth0_org_id: orgId,
        auth0_user_id: event.user.user_id,
        user_role: role || null,
        iat: nowSec,
        exp: nowSec + 60 * 60, // 1 hour
      },
      supabaseJwtSecret,
      { algorithm: 'HS256' }
    )
    api.idToken.setCustomClaim(CLAIM_NS + 'supabase_jwt', supabaseJwt)
  }
}

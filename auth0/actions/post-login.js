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
 * Required Secrets (set in Auth0 Dashboard → Actions → Secrets):
 *   BACKEND_URL          — Your Express server: https://api.easyops.co.za
 *   AUTH0_SYNC_SECRET    — must match process.env.AUTH0_SYNC_SECRET on your server
 *   SUPABASE_JWT_SECRET  — the project's legacy HS256 JWT secret (Supabase →
 *                          Project Settings → API → JWT Settings → JWT Secret).
 *                          Used to mint the `supabase_jwt` claim the frontend
 *                          attaches to Supabase REST calls for RLS.
 *
 * Required Dependencies (Auth0 Action editor → Dependencies):
 *   jsonwebtoken (latest)
 */

const jwt = require('jsonwebtoken')

const CLAIM_NS = 'https://easyops.us.auth0.com/'

exports.onExecutePostLogin = async (event, api) => {
  // The login org, if this was an Organization-scoped login. Passed to the sync
  // endpoint so it resolves the membership/role in THIS tenant.
  const orgIdFromLogin = event.organization && event.organization.id

  // Fallback role from app_metadata. On a custom-database connection this is not
  // a reliable carrier of the role across logins, so it is only used when the DB
  // sync yields nothing (e.g. first login before tenant provisioning).
  const fallbackRole = event.user.app_metadata && event.user.app_metadata.role

  // 1. Sync the Supabase users row and resolve the AUTHORITATIVE access tier
  //    from the database (source of truth: org_members.role). The claim is
  //    injected from the response below.
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
          org_id: orgIdFromLogin,
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

  // 2. Inject claims (DB-authoritative when the sync succeeded) on both tokens
  //    so the frontend AuthContext and the Express verifyAuth0Token() agree.
  if (role) {
    api.idToken.setCustomClaim(CLAIM_NS + 'role', role)
    api.accessToken.setCustomClaim(CLAIM_NS + 'role', role)
  }

  if (orgId) {
    api.idToken.setCustomClaim(CLAIM_NS + 'org_id', orgId)
    api.accessToken.setCustomClaim(CLAIM_NS + 'org_id', orgId)
  }

  // 3. Mint a short-lived Supabase JWT (HS256) and inject it as a namespaced ID
  //    token claim. On the Regular Web App flow the browser does not hold the
  //    Auth0 token, so GET /api/supabase-token reads this claim from the session
  //    and hands it to the Supabase client, which attaches it as a Bearer token.
  //    Supabase validates it with the same JWT secret and applies RLS:
  //      - sub      -> auth.jwt() ->> 'sub'  (row ownership policies)
  //      - org_id   -> public.org_id()       (tenant isolation)
  //      - role/aud -> 'authenticated'       (PostgREST assumes the authenticated role)
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
        org_id: orgId || null,
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

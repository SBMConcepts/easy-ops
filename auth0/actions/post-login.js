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
  // ── 1. Attach org_id claim ──────────────────────────────────────────────
  // Auth0 automatically sets event.organization when the user logs in via an
  // organization (subdomain login flow). We forward the org id as a custom
  // claim so verifyAuth0Token() can read it from the JWT payload.
  const orgId = event.organization?.id ?? null

  if (orgId) {
    api.idToken.setCustomClaim(`${CLAIM_NS}org_id`, orgId)
    api.accessToken.setCustomClaim(`${CLAIM_NS}org_id`, orgId)
  }

  // ── 2. Attach role claim ────────────────────────────────────────────────
  // Role is stored in app_metadata by the registration flow and the
  // post-user-registration Action. We forward it to the token so the
  // frontend can render role-gated UI without an extra API round-trip.
  const role = event.user.app_metadata?.role ?? 'employee'
  api.idToken.setCustomClaim(`${CLAIM_NS}role`, role)
  api.accessToken.setCustomClaim(`${CLAIM_NS}role`, role)

  // ── 3. Sync user row to Supabase ────────────────────────────────────────
  // Fire-and-forget: we do NOT block login if the sync call fails.
  // The Express route does an UPSERT so repeated calls are idempotent.
  const apiBaseUrl = event.secrets?.API_BASE_URL
  const syncSecret = event.secrets?.AUTH0_SYNC_SECRET

  if (!apiBaseUrl || !syncSecret) {
    console.warn(
      '[post-login] API_BASE_URL or AUTH0_SYNC_SECRET secret not configured — skipping sync'
    )
    return
  }

  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': syncSecret,
      },
      body: JSON.stringify({
        auth0UserId: event.user.user_id,
        email: event.user.email,
        name: event.user.name ?? event.user.email,
        avatarUrl: event.user.picture ?? null,
      }),
    })

    if (!res.ok) {
      // Log but do not block login
      const text = await res.text().catch(() => '')
      console.error(`[post-login] Sync failed: ${res.status} ${text}`)
    }
  } catch (err) {
    console.error('[post-login] Sync fetch error:', err?.message ?? err)
  }
}

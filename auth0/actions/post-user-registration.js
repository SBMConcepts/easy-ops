/**
 * Auth0 Action: Post-User-Registration
 * Trigger: User Registration / Post User Registration
 *
 * Fires once after a NEW user is created — whether they self-registered or
 * accepted an invitation. At this point the user exists in Auth0 but may
 * not yet have a row in your Supabase public.users table.
 *
 * Responsibilities:
 *  1. If the user was created as part of an org invitation (event.organization
 *     is present), stamp app_metadata.org_id so post-login can forward it.
 *  2. For users who registered independently (no org context yet), default role
 *     to 'employee' in app_metadata.
 *  3. Call POST /api/auth/sync to create the Supabase user row immediately —
 *     so the row exists even if the user never logs in again right away.
 *
 * Required Secrets:
 *   API_BASE_URL       — e.g. https://api.easy-ops-za.vercel.app
 *   AUTH0_SYNC_SECRET  — must match process.env.AUTH0_SYNC_SECRET on your server
 */

exports.onExecutePostUserRegistration = async (event, api) => {
  const orgId = event.organization?.id ?? null
  const existingRole = event.user.app_metadata?.role

  // ── 1. Stamp app_metadata with role if not already set ──────────────────
  // The registration route (/api/auth/register) creates the admin user via the
  // Management API before this Action fires. For invited employees the role is
  // set by the invite route. Fall back to 'employee' for any other path.
  if (!existingRole) {
    api.user.setAppMetadata('role', 'employee')
  }

  if (orgId && !event.user.app_metadata?.org_id) {
    api.user.setAppMetadata('org_id', orgId)
  }

  // ── 2. Sync to Supabase ─────────────────────────────────────────────────
  const apiBaseUrl = event.secrets?.API_BASE_URL
  const syncSecret = event.secrets?.AUTH0_SYNC_SECRET

  if (!apiBaseUrl || !syncSecret) {
    console.warn(
      '[post-registration] API_BASE_URL or AUTH0_SYNC_SECRET not configured — skipping sync'
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
      const text = await res.text().catch(() => '')
      console.error(`[post-registration] Sync failed: ${res.status} ${text}`)
    }
  } catch (err) {
    console.error('[post-registration] Sync fetch error:', err?.message ?? err)
  }
}

/**
 * Auth0 Action: Post-User-Registration
 * Trigger: User Registration / Post User Registration
 *
 * NOTE: api.user is NOT available in this trigger — only api.cache exists.
 * To write app_metadata after registration you must call the Management API.
 *
 * Required Secrets (Auth0 Dashboard → Actions → your action → Secrets):
 *   AUTH0_DOMAIN               — e.g. easy-ops.us.auth0.com
 *   AUTH0_M2M_CLIENT_ID
 *   AUTH0_M2M_CLIENT_SECRET
 *   API_BASE_URL               — Auth0 Management API audience: https://easy-ops.us.auth0.com/api/v2/
 *   BACKEND_URL                — Your Express server: https://api.easyops.co.za
 *   AUTH0_SYNC_SECRET
 */

exports.onExecutePostUserRegistration = async (event, api) => {
  var domain = event.secrets.AUTH0_DOMAIN
  var clientId = event.secrets.AUTH0_M2M_CLIENT_ID
  var clientSecret = event.secrets.AUTH0_M2M_CLIENT_SECRET
  var managementAudience = event.secrets.API_BASE_URL // https://easy-ops.us.auth0.com/api/v2/
  var backendUrl = event.secrets.BACKEND_URL // https://api.easyops.co.za
  var syncSecret = event.secrets.AUTH0_SYNC_SECRET

  // ── 1. Stamp app_metadata via Management API ──────────────────────────────
  // api.user does not exist in this trigger — use the Management API instead.
  var existingRole = event.user.app_metadata && event.user.app_metadata.role
  var orgId = event.organization && event.organization.id ? event.organization.id : null
  var needsMetadataUpdate =
    !existingRole || (orgId && !(event.user.app_metadata && event.user.app_metadata.org_id))

  if (needsMetadataUpdate && domain && clientId && clientSecret) {
    try {
      // Get a Management API token
      var tokenRes = await fetch('https://' + domain + '/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          audience: managementAudience,
        }),
      })
      var tokenData = await tokenRes.json()
      var mgmtToken = tokenData.access_token

      if (mgmtToken) {
        var patch = {}
        if (!existingRole) patch.role = 'employee'
        if (orgId && !(event.user.app_metadata && event.user.app_metadata.org_id)) {
          patch.org_id = orgId
        }

        await fetch(
          'https://' + domain + '/api/v2/userinfo/' + encodeURIComponent(event.user.user_id),
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + mgmtToken,
            },
            body: JSON.stringify({ app_metadata: patch }),
          }
        )
      }
    } catch (err) {
      // Non-fatal — post-login will still forward whatever metadata exists
      console.error(
        '[post-registration] app_metadata update error:',
        err && err.message ? err.message : err
      )
    }
  }

  // ── 2. Sync user row to Supabase ──────────────────────────────────────────
  if (!backendUrl || !syncSecret) {
    console.warn('[post-registration] BACKEND_URL or AUTH0_SYNC_SECRET not set — skipping sync')
    return
  }

  try {
    var res = await fetch(backendUrl + '/api/auth/sync', {
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
        org_id: orgId || undefined,
      }),
    })

    if (!res.ok) {
      var text = await res.text().catch(function () {
        return ''
      })
      console.error('[post-registration] Sync failed: ' + res.status + ' ' + text)
    }
  } catch (err) {
    console.error('[post-registration] Sync fetch error:', err && err.message ? err.message : err)
  }
}

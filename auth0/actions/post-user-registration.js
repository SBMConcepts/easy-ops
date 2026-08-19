/**
 * Auth0 Action: Post-User-Registration
 * Trigger: User Registration / Post User Registration
 *
 * NOTE: api.user is NOT available in this trigger — only api.cache exists.
 * To write app_metadata after registration you must call the Management API.
 *
 */

exports.onExecutePostUserRegistration = async (event, api) => {
  var domain = event.secrets.AUTH0_DOMAIN
  var clientId = event.secrets.AUTH0_M2M_CLIENT_ID
  var clientSecret = event.secrets.AUTH0_M2M_CLIENT_SECRET
  var managementAudience = event.secrets.API_BASE_URL
  var backendUrl = event.secrets.BACKEND_URL
  var syncSecret = event.secrets.AUTH0_SYNC_SECRET

  // ── 1. Stamp app_metadata via Management API ──────────────────────────────
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
        if (!existingRole) patch.role = 'member' // default role for new users
        if (orgId && !(event.user.app_metadata && event.user.app_metadata.org_id)) {
          patch.org_id = orgId
        }

        await fetch(`https://${domain}/api/v2/userinfo/${event.user.user_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + mgmtToken,
          },
          body: JSON.stringify({ app_metadata: patch }),
        })
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
    var res = await fetch(backendUrl + '/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': syncSecret,
      },
      body: JSON.stringify({
        auth0_user_id: event.user.user_id,
        auth0_org_id: orgId,
        email: event.user.email,
        phone_number: event.user.phone_number,
        full_name: event.user.name || event.user.email || event.user.phone_number,
        avatar_url: event.user.picture || null,
        org_id: orgId,
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

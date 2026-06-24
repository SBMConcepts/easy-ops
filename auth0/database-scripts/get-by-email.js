/**
 * Auth0 Custom Database Script: Get User by Email
 * Trigger: Password Reset, Email Verification, Change Email, Change Password
 *
 * Called by Auth0 to look up a user by email without validating a password.
 * Returns the user profile (no password_hash), or null if not found.
 *
 * Configuration variables (Auth0 Dashboard → Authentication → Database →
 * your connection → Settings → Configuration):
 *
 *   DATABASE_URL — Supabase Transaction-mode pooler URL (port 6543)
 */

function getByEmail(email, context, callback) {
  var pg = require('pg')
  var url = require('url')

  // Auth0's sandbox pg version does not support connectionString reliably —
  // parse the URL manually and pass individual parameters instead.
  var parsed = url.parse(configuration.DATABASE_URL)
  var auth = parsed.auth ? parsed.auth.split(':') : ['', '']

  var client = new pg.Client({
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 5432,
    database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'postgres',
    user: decodeURIComponent(auth[0] || ''),
    password: decodeURIComponent(auth[1] || ''),
    ssl: { rejectUnauthorized: false },
  })

  client.connect(function (connectErr) {
    if (connectErr) {
      client.end()
      return callback(new Error('Database connection error: ' + connectErr.message))
    }

    var sql = [
      'SELECT',
      '  u.id,',
      '  u.auth0_user_id,',
      '  u.email,',
      '  u.full_name,',
      '  u.avatar_url,',
      '  u.status,',
      '  m.role,',
      '  o.auth0_org_id,',
      '  o.slug AS tenant_slug',
      'FROM public.users u',
      "LEFT JOIN public.org_members m ON m.user_id = u.id AND m.status = 'active'",
      'LEFT JOIN public.organizations o ON o.auth0_org_id = m.org_id',
      'WHERE u.email = $1',
      'ORDER BY m.joined_at ASC NULLS LAST',
      'LIMIT 1',
    ].join(' ')

    client.query(sql, [email.toLowerCase().trim()], function (queryErr, result) {
      client.end()

      if (queryErr) {
        return callback(new Error('Database query error: ' + queryErr.message))
      }

      // Return null (not an error) when the user is not found.
      // Auth0 uses this to decide whether to send a password reset email.
      if (result.rows.length === 0) {
        return callback(null)
      }

      var user = result.rows[0]

      return callback(null, {
        user_id: user.auth0_user_id || user.id,
        email: user.email,
        email_verified: true,
        name: user.full_name || user.email,
        picture: user.avatar_url || null,
        app_metadata: {
          role: user.role || 'employee',
          org_id: user.auth0_org_id || null,
          tenant_slug: user.tenant_slug || null,
        },
      })
    })
  })
}

/**
 * Auth0 Custom Database Script: Login
 * Trigger: Login
 *
 * Validates email + password against public.users in Supabase Postgres.
 * bcrypt and pg are available in Auth0's sandbox by default.
 *
 * Configuration variables (Auth0 Dashboard → Authentication → Database →
 * your connection → Settings → Configuration):
 *
 *   DATABASE_URL — Supabase Transaction-mode pooler URL (port 6543)
 *     postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 */

function login(email, password, context, callback) {
  var pg = require('pg')
  var bcrypt = require('bcrypt')
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
      '  u.password_hash,',
      '  u.status,',
      '  m.role,',
      '  t.auth0_org_id,',
      '  t.slug AS tenant_slug',
      'FROM public.users u',
      "LEFT JOIN public.memberships m ON m.user_id = u.id AND m.status = 'active'",
      'LEFT JOIN public.tenants t ON t.id = m.tenant_id',
      'WHERE u.email = $1',
      'LIMIT 1',
    ].join(' ')

    client.query(sql, [email.toLowerCase().trim()], function (queryErr, result) {
      client.end()

      if (queryErr) {
        return callback(new Error('Database query error: ' + queryErr.message))
      }

      if (result.rows.length === 0) {
        // Return WrongUsernameOrPasswordError — never reveal whether the email exists
        return callback(new WrongUsernameOrPasswordError(email))
      }

      var user = result.rows[0]

      // Block suspended users
      if (user.status === 'suspended' || user.status === 'deleted') {
        return callback(new Error('Account is not active.'))
      }

      // Users created via Management API invitation have no local password
      if (!user.password_hash) {
        return callback(new WrongUsernameOrPasswordError(email))
      }

      bcrypt.compare(password, user.password_hash, function (bcryptErr, isValid) {
        if (bcryptErr) {
          return callback(new Error('Password verification error: ' + bcryptErr.message))
        }

        if (!isValid) {
          return callback(new WrongUsernameOrPasswordError(email))
        }

        // Return the Auth0 user profile.
        // user_id must be the Auth0 sub (auth0_user_id) if already linked,
        // otherwise fall back to the local UUID so Auth0 can link it later.
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
  })
}

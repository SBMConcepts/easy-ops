/**
 * Auth0 Custom Database — CREATE script (sign up)
 * Connection: Username-Password-Authentication (custom database)
 *
 * Persists a new credential row in public.user_credentials with a bcrypt hash of
 * the password. The row's generated UUID becomes the user_id returned by Login /
 * Get User (and therefore the Auth0 subject "auth0|<id>").
 *
 * Application state (public.users, org_members) is NOT written here — it is
 * created/linked by POST /api/auth/sync from the post-login Action on first
 * login. Note: interactive signups are still gated by the pre-user-registration
 * Action (invitation/org required).
 *
 * Sandbox globals used: configuration, ValidationError.
 */
function create(user, callback) {
  const bcrypt = require('bcrypt')
  const { Client } = require('pg')

  const connectionString = configuration.DATABASE_URL
  if (!connectionString) {
    return callback(new Error('DATABASE_URL is not configured for this connection.'))
  }

  const email = String(user.email || '')
    .trim()
    .toLowerCase()
  if (!email || !user.password) {
    return callback(new ValidationError('invalid_input', 'Email and password are required.'))
  }

  let dsn
  try {
    dsn = new URL(connectionString)
  } catch (e) {
    return callback(new Error('DATABASE_URL is malformed.'))
  }

  bcrypt.hash(user.password, 10, function (hashErr, passwordHash) {
    if (hashErr) {
      return callback(hashErr)
    }

    const client = new Client({
      user: decodeURIComponent(dsn.username),
      password: decodeURIComponent(dsn.password),
      host: dsn.hostname,
      port: dsn.port ? parseInt(dsn.port, 10) : 5432,
      database: dsn.pathname.replace(/^\//, '') || 'postgres',
      ssl: { rejectUnauthorized: false },
    })

    client.connect(function (connErr) {
      if (connErr) {
        return callback(connErr)
      }

      // email_verified defaults false (the Verify flow flips it); status 'active'.
      const sql = 'INSERT INTO public.user_credentials (email, password_hash) VALUES ($1, $2)'

      client.query(sql, [email, passwordHash], function (queryErr) {
        client.end()
        if (queryErr) {
          // 23505 = unique_violation on the lower(email) index.
          if (queryErr.code === '23505') {
            return callback(
              new ValidationError('user_exists', 'A user with this email already exists.')
            )
          }
          return callback(queryErr)
        }
        return callback(null)
      })
    })
  })
}

/**
 * Auth0 Custom Database — CREATE script (sign up)
 * Connection: Username-Password-Authentication (custom database)
 *
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

      // Insert the credential row, generating the id once so it can also seed
      // auth0_user_id = 'auth0|' || id (the Auth0 subject). email_verified
      // defaults false (the Verify flow flips it) and status is 'active'.
      // Returning the id makes the Auth0 subject the credential id, so Login /
      // Get User / Create stay in agreement on a stable identity.
      const sql =
        'INSERT INTO public.user_credentials ' +
        '(id, email, password_hash, email_verified, status, auth0_user_id) ' +
        "SELECT gen.id, $1, $2, false, 'active', 'auth0|' || gen.id::text " +
        'FROM (SELECT gen_random_uuid() AS id) gen ' +
        'RETURNING id'

      client.query(sql, [email, passwordHash], function (queryErr, result) {
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
        const row = result && result.rows && result.rows[0]
        return callback(null, {
          user_id: row && row.id,
          email: email,
          email_verified: false,
        })
      })
    })
  })
}

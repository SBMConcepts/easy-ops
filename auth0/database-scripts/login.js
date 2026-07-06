/**
 * Auth0 Custom Database — LOGIN script (MANDATORY)
 * Connection: Username-Password-Authentication (custom database)
 *
 *
 */
function login(email, password, callback) {
  const bcrypt = require('bcrypt')
  const { Client } = require('pg')

  const connectionString = configuration.DATABASE_URL
  if (!connectionString) {
    return callback(new Error('DATABASE_URL is not configured for this connection.'))
  }

  // The Auth0 sandbox `pg` does not reliably honor a connection string, so parse
  // the DSN manually and pass discrete fields.
  let dsn
  try {
    dsn = new URL(connectionString)
  } catch (e) {
    return callback(new Error('DATABASE_URL is malformed.'))
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

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase()
    const sql =
      'SELECT id, auth0_org_id, auth0_user_id, email, password_hash, email_verified, status ' +
      'FROM public.user_credentials WHERE lower(email) = $1 LIMIT 1'

    client.query(sql, [normalizedEmail], function (queryErr, result) {
      if (queryErr) {
        client.end()
        return callback(queryErr)
      }

      const row = result.rows[0]

      // Never reveal whether the email exists, or whether the account is blocked.
      if (!row || row.status !== 'active') {
        client.end()
        return callback(new WrongUsernameOrPasswordError(email))
      }

      bcrypt.compare(password, row.password_hash, function (cmpErr, isValid) {
        client.end()
        if (cmpErr) {
          return callback(cmpErr)
        }
        if (!isValid) {
          return callback(new WrongUsernameOrPasswordError(email))
        }

        return callback(null, {
          user_id: row.id,
          auth0_org_id: row.auth0_org_id,
          auth0_user_id: row.auth0_user_id,
          email: row.email,
          email_verified: row.email_verified === true,
        })
      })
    })
  })
}

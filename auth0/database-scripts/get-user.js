/**
 * Auth0 Custom Database — GET USER script
 * Connection: Username-Password-Authentication (custom database)
 *
 * Looks a user up by email OR phone number WITHOUT verifying a password.
 * Auth0 calls this for password-reset/verification flows and to detect
 * duplicate signups against either identifier.
 *
 * Return the profile if found, or callback(null) (no error, no user) if not —
 * never surface a database miss as an error, and never reveal account status, so
 * the connection does not leak whether an identifier is registered.
 *
 * Sandbox globals used: configuration.
 */
function getByEmail(identifier, callback) {
  const { Client } = require('pg')

  const connectionString = configuration.DATABASE_URL
  if (!connectionString) {
    return callback(new Error('DATABASE_URL is not configured for this connection.'))
  }

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

    const normalized = String(identifier || '').trim()
    const sql =
      'SELECT id, auth0_org_id, auth0_user_id, email, mobile_number, email_verified, ' +
      'phone_verified, status ' +
      'FROM public.user_credentials WHERE lower(email) = lower($1) OR mobile_number = $1 LIMIT 1'

    client.query(sql, [normalized], function (queryErr, result) {
      client.end()
      if (queryErr) {
        return callback(queryErr)
      }

      const row = result.rows[0]
      // No user (or a soft-deleted one) => report "not found" with no error.
      if (!row || row.status === 'deleted') {
        return callback(null)
      }

      return callback(null, {
        user_id: row.id,
        auth0_org_id: row.auth0_org_id,
        auth0_user_id: row.auth0_user_id,
        email: row.email || undefined,
        email_verified: row.email_verified === true,
        phone_number: row.mobile_number || undefined,
        phone_verified: row.phone_verified === true,
      })
    })
  })
}

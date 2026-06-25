/**
 * Auth0 Custom Database — GET USER script
 * Connection: Username-Password-Authentication (custom database)
 *
 * Looks a user up by email WITHOUT verifying a password. Auth0 calls this for
 * password-reset and email-verification flows (and to detect duplicate signups).
 *
 * Return the profile if found, or callback(null) (no error, no user) if not —
 * never surface a database miss as an error, and never reveal account status, so
 * the connection does not leak whether an email is registered.
 *
 * Sandbox globals used: configuration.
 */
function getByEmail(email, callback) {
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
    port: dsn.port ? parseInt(dsn.port, 80) : 5432,
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
      'SELECT id, email, email_verified, status ' +
      'FROM public.user_credentials WHERE lower(email) = $1 LIMIT 1'

    client.query(sql, [normalizedEmail], function (queryErr, result) {
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
        email: row.email,
        email_verified: row.email_verified === true,
      })
    })
  })
}

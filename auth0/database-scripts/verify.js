/**
 * Auth0 Custom Database — VERIFY script (email verification)
 * Connection: Username-Password-Authentication (custom database)
 *
 * Marks a user's email as verified in public.user_credentials. Auth0 invokes
 * this when the user completes the verification email link. Phone-verified
 * users never reach this script — Auth0's own OTP flow verifies phone_number
 * before create.js runs, so phone_verified is stamped directly at signup.
 *
 * Signature is (email, callback). Return callback(null, true) on success.
 *
 * Sandbox globals used: configuration.
 */
function verify(email, callback) {
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

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase()
    const sql =
      'UPDATE public.user_credentials ' +
      'SET email_verified = true, auth0_org_id = auth0_org_id, updated_at = now() ' +
      'WHERE lower(email) = $1 AND status <> $2'

    client.query(sql, [normalizedEmail, 'deleted'], function (queryErr, result) {
      client.end()
      if (queryErr) {
        return callback(queryErr)
      }
      // true when a row was updated, false when no matching active user existed.
      return callback(null, result.rowCount > 0)
    })
  })
}

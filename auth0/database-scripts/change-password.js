/**
 * Auth0 Custom Database — CHANGE PASSWORD script (password reset)
 * Connection: Username-Password-Authentication (custom database)
 *
 * Replaces the bcrypt hash in public.user_credentials. Auth0 invokes this for
 * both the "forgot password" reset flow and explicit password changes.
 *
 * Signature is (email, newPassword, callback). Return callback(null, true) when
 * a row was updated.
 *
 * Sandbox globals used: configuration.
 */
function changePassword(identifier, newPassword, callback) {
  const bcrypt = require('bcrypt')
  const { Client } = require('pg')

  const connectionString = configuration.DATABASE_URL
  if (!connectionString) {
    return callback(new Error('DATABASE_URL is not configured for this connection.'))
  }

  if (!newPassword) {
    return callback(new Error('A new password is required.'))
  }

  let dsn
  try {
    dsn = new URL(connectionString)
  } catch (e) {
    return callback(new Error('DATABASE_URL is malformed.'))
  }

  bcrypt.hash(newPassword, 10, function (hashErr, passwordHash) {
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

      const normalized = String(identifier || '').trim()
      const sql =
        'UPDATE public.user_credentials ' +
        'SET password_hash = $2, updated_at = now() ' +
        'WHERE (lower(email) = lower($1) OR mobile_number = $1) AND status <> $3'

      client.query(sql, [normalized, passwordHash, 'deleted'], function (queryErr, result) {
        client.end()
        if (queryErr) {
          return callback(queryErr)
        }
        return callback(null, result.rowCount > 0)
      })
    })
  })
}

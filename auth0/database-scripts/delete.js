/**
 * Auth0 Custom Database — DELETE script (delete user)
 * Connection: Username-Password-Authentication (custom database)
 *
 * Removes the credential row from public.user_credentials when a user is deleted
 * in Auth0. Under the current schema, org_members.auth0_user_id has a foreign key
 * to user_credentials.(auth0_user_id, auth0_org_id) with ON DELETE CASCADE, so
 * removing the credential row also removes the caller's org_members membership.
 * The public.users invite row is independent (user_credentials no longer
 * references it) and is managed separately.
 *
 * Signature is (id, callback) where `id` is the user_id previously returned by
 * Login / Get User (the user_credentials.id UUID, i.e. the Auth0 sub without the
 * "auth0|" prefix).
 *
 * Sandbox globals used: configuration.
 */
function remove(id, callback) {
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

    const sql = 'DELETE FROM public.user_credentials WHERE id = $1'

    client.query(sql, [id], function (queryErr) {
      client.end()
      if (queryErr) {
        return callback(queryErr)
      }
      return callback(null)
    })
  })
}

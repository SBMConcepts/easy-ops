/**
 * Auth0 Custom Database — DELETE script (delete user)
 * Connection: Username-Password-Authentication (custom database)
 *
 * public.users is the real identity anchor: user_credentials.auth0_user_id
 * and org_members.auth0_user_id both FK to users(auth0_user_id) ON DELETE
 * CASCADE, so deleting the users row removes the credential row AND every
 * org_members row for that person in one statement. Deleting only
 * user_credentials would cascade org_members (it has its own composite FK
 * there too) but would leave an orphaned, credential-less users/PII row
 * behind — so this always deletes via users, not user_credentials directly.
 *
 * Signature is (id, callback) where `id` is the user_id previously returned by
 * Login / Get User / Create (user_credentials.id UUID, i.e. the Auth0 sub
 * without the "auth0|" prefix).
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

    const sql =
      'DELETE FROM public.users ' +
      'WHERE auth0_user_id = (SELECT auth0_user_id FROM public.user_credentials WHERE id = $1)'

    client.query(sql, [id], function (queryErr) {
      client.end()
      if (queryErr) {
        return callback(queryErr)
      }
      return callback(null)
    })
  })
}

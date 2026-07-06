/**
 * Auth0 Custom Database — CREATE script (sign up)
 * Connection: Username-Password-Authentication (custom database)
 *
 * Signups are invitation-only (POST /api/organizations stamps an 'admin'
 * invitation for the org creator; POST /api/invitations stamps the chosen role
 * for invited members). This script resolves that invitation by email and then
 * populates the full provisioning chain atomically, in foreign-key order:
 *
 *   public.users  ->  public.user_credentials  ->  public.org_members
 *
 * The generated credential id doubles as the Auth0 subject (auth0|<id>), so all
 * three rows agree on identity. email_verified is set true because receiving the
 * invitation already proved ownership of the address.
 *
 * Sandbox globals used: configuration.
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

      // Signups are invitation-only. Resolve the org + assigned role from the
      // invitation created by POST /api/organizations (admin) or
      // POST /api/invitations (member). No invitation => reject the signup so
      // orphaned users are never created.
      const inviteSql =
        'SELECT auth0_org_id, role FROM public.invitations WHERE lower(email) = $1 LIMIT 1'

      client.query(inviteSql, [email], function (inviteErr, inviteResult) {
        if (inviteErr) {
          client.end()
          return callback(inviteErr)
        }

        const invite = inviteResult && inviteResult.rows && inviteResult.rows[0]
        if (!invite) {
          client.end()
          return callback(
            new ValidationError('no_invitation', 'An invitation is required to sign up.')
          )
        }

        // Populate users -> user_credentials -> org_members in one atomic
        // statement so the FK chain is satisfied and a failure rolls back the
        // whole signup. gen.id is created once and reused as both the credential
        // id and the auth0|<id> subject. Any stale pending|<email> placeholder
        // (seeded by POST /api/invitations) is removed first.
        const provisionSql =
          'WITH gen AS (SELECT gen_random_uuid() AS id), ' +
          "del_pending AS (DELETE FROM public.users WHERE auth0_user_id = 'pending|' || $1), " +
          'new_user AS (' +
          '  INSERT INTO public.users (auth0_user_id, auth0_org_id, email, full_name) ' +
          "  SELECT 'auth0|' || gen.id::text, $3, $1, $4 FROM gen" +
          '), ' +
          'new_cred AS (' +
          '  INSERT INTO public.user_credentials ' +
          '    (id, auth0_org_id, auth0_user_id, email, password_hash, email_verified, status) ' +
          "  SELECT gen.id, $3, 'auth0|' || gen.id::text, $1, $2, true, 'active' FROM gen " +
          '  RETURNING id' +
          '), ' +
          'new_member AS (' +
          '  INSERT INTO public.org_members (auth0_org_id, auth0_user_id, role, status, joined_at) ' +
          "  SELECT $3, 'auth0|' || gen.id::text, $5, 'active', now() FROM gen " +
          '  ON CONFLICT (auth0_org_id, auth0_user_id) ' +
          "  DO UPDATE SET role = EXCLUDED.role, status = 'active'" +
          ') ' +
          'SELECT id FROM new_cred'

        const fullName = String(user.name || user.nickname || '').trim()

        client.query(
          provisionSql,
          [email, passwordHash, invite.auth0_org_id, fullName, invite.role],
          function (queryErr, result) {
            client.end()
            if (queryErr) {
              // 23505 = unique_violation (e.g. a credential for this email).
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
              email_verified: true,
            })
          }
        )
      })
    })
  })
}

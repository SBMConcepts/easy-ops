/**
 * Auth0 Custom Database — CREATE script (sign up)
 * Connection: Username-Password-Authentication (custom database)
 *
 * Signups are invitation-only. POST /api/organizations (org creator) and
 * POST /api/invitations (invited members) each write a row to
 * public.invitations (auth0_org_id, email and/or phone_number, role,
 * expires_at, token). This script resolves that pending invitation by EITHER
 * identifier, then provisions the identity chain in foreign-key order:
 *
 *   public.users  ->  public.user_credentials  ->  public.org_members
 *
 * (users is the real identity/profile table; user_credentials is the login
 * store FK'd to users.auth0_user_id; org_members is FK'd to BOTH users and
 * user_credentials). The generated auth0_user_id is 'auth0|<user_credentials
 * .id>' so the Auth0 sub agrees with the id this script returns. Finally the
 * originating invitation is stamped accepted so it cannot be reused.
 *
 * Requires Flexible Identifiers (Phone Number attribute) enabled on this
 * connection for `user.phone_number` to be populated on phone-only signups.
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

  const email = user.email ? String(user.email).trim().toLowerCase() : null
  const phoneNumber = user.phone_number ? String(user.phone_number).trim() : null
  if (!email && !phoneNumber) {
    return callback(new ValidationError('invalid_input', 'An email or phone number is required.'))
  }
  if (!user.password) {
    return callback(new ValidationError('invalid_input', 'A password is required.'))
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
      // pending row in public.invitations (created by POST /api/organizations
      // or POST /api/invitations), matching whichever identifier was provided.
      // Must be unexpired, unrevoked and unaccepted. If more than one invite
      // matches, the most recent one wins.
      const inviteSql =
        'SELECT auth0_org_id, role, phone_number FROM public.invitations ' +
        'WHERE (($1::text IS NOT NULL AND lower(email) = $1) OR ($2::text IS NOT NULL AND phone_number = $2)) ' +
        'AND accepted_at IS NULL AND revoked_at IS NULL ' +
        'AND expires_at > now() ORDER BY created_at DESC LIMIT 1'

      client.query(inviteSql, [email, phoneNumber], function (inviteErr, inviteResult) {
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

        // Provision users -> user_credentials -> org_members in one atomic
        // statement so the FK chain is satisfied and a failure rolls back the
        // whole signup. gen.cred_id is created once and reused as both the
        // credential id and the auth0|<id> subject stamped onto all three
        // rows. The originating invitation is stamped accepted at the end.
        //
        // dbMobileNumber/dbPhoneVerified are DB-only contact fields: they
        // prefer the identifier the invitee actually signed up with, else
        // fall back to the mobile number the admin captured on the
        // invitation itself. This is intentionally kept separate from the
        // phone_number/phone_verified reported back to Auth0 below, which
        // must stay tied to the real signup identifier so an admin-entered,
        // never-OTP-verified number can't be used to claim a verified Auth0
        // login identifier.
        const dbMobileNumber = phoneNumber || invite.phone_number || null
        const dbPhoneVerified = !!dbMobileNumber

        const provisionSql =
          'WITH gen AS (SELECT gen_random_uuid() AS cred_id), ' +
          'new_user AS (' +
          '  INSERT INTO public.users (auth0_user_id, auth0_org_id, email, mobile_number, full_name) ' +
          "  SELECT 'auth0|' || gen.cred_id::text, $3, $1, $7, $5 FROM gen " +
          '  RETURNING auth0_user_id' +
          '), ' +
          'new_cred AS (' +
          '  INSERT INTO public.user_credentials ' +
          '    (id, auth0_user_id, auth0_org_id, email, mobile_number, full_name, password_hash, ' +
          '     email_verified, phone_verified, status) ' +
          '  SELECT gen.cred_id, new_user.auth0_user_id, $3, $1, $7, $5, $4, ' +
          '    ($1::text IS NOT NULL), $8, ' +
          "    'active' FROM gen, new_user " +
          '  RETURNING id, auth0_user_id' +
          '), ' +
          'new_member AS (' +
          '  INSERT INTO public.org_members (auth0_org_id, auth0_user_id, full_name, role, status, joined_at) ' +
          "  SELECT $3, new_cred.auth0_user_id, $5, $6, 'active', now() FROM new_cred " +
          '  ON CONFLICT (auth0_org_id, auth0_user_id) ' +
          "  DO UPDATE SET role = EXCLUDED.role, status = 'active', full_name = EXCLUDED.full_name " +
          '  RETURNING id' +
          '), ' +
          'accept_invite AS (' +
          '  UPDATE public.invitations SET accepted_at = now(), accepted_member_id = (SELECT id FROM new_member) ' +
          '  WHERE auth0_org_id = $3 ' +
          '  AND (($1::text IS NOT NULL AND lower(email) = $1) OR ($2::text IS NOT NULL AND phone_number = $2)) ' +
          '  AND accepted_at IS NULL' +
          ') ' +
          'SELECT id FROM new_cred'

        const fullName = String(user.name || user.nickname || '').trim()

        client.query(
          provisionSql,
          [
            email,
            phoneNumber,
            invite.auth0_org_id,
            passwordHash,
            fullName,
            invite.role,
            dbMobileNumber,
            dbPhoneVerified,
          ],
          function (queryErr, result) {
            client.end()
            if (queryErr) {
              // 23505 = unique_violation (e.g. a credential for this email).
              if (queryErr.code === '23505') {
                return callback(
                  new ValidationError(
                    'user_exists',
                    'A user with this email or phone number already exists.'
                  )
                )
              }
              return callback(queryErr)
            }
            const row = result && result.rows && result.rows[0]
            return callback(null, {
              user_id: row && row.id,
              email: email || undefined,
              email_verified: !!email,
              phone_number: phoneNumber || undefined,
              phone_verified: !!phoneNumber,
            })
          }
        )
      })
    })
  })
}

import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'
import { jobRoleToTier, type AccessRole } from '../lib/rbac.js'
import { permissionsForRole } from '../lib/permissions.js'
import { findActiveOrgMember } from '../lib/org-members.js'

const router = Router()

// Fields actually sent by auth0/actions/post-login.js + post-user-registration.js.
// public.users is the real identity/profile table (NOT an invite table);
// public.invitations is the separate pending-invite record; public.org_members
// is per-org membership only (no email/avatar_url columns there — identity
// display data lives on `users`, synced onto org_members.full_name/first_name/
// last_name by the trg_sync_org_members_identity trigger... except that
// trigger watches user_credentials, not users, so this route updates
// org_members' name fields directly too).
router.post('/api/auth/sync', async (req: Request, res: Response) => {
  const secret = process.env.AUTH0_SYNC_SECRET
  if (!secret || req.header('x-api-key') !== secret) {
    res.status(401).json({ error: 'Invalid sync credentials.' })
    return
  }

  const body = (req.body ?? {}) as {
    auth0_user_id?: string
    auth0_org_id?: string
    email?: string
    phone_number?: string
    full_name?: string
    avatar_url?: string | null
    role?: string | null
  }

  if (!body.auth0_user_id || (!body.email && !body.phone_number)) {
    res.status(400).json({ error: 'auth0_user_id and (email or phone_number) are required.' })
    return
  }

  // Every user in this B2B product belongs to a tenant: users.auth0_org_id is
  // NOT NULL. Reject an orgless sync with a clean 400 rather than a DB error.
  const auth0_org_id = typeof body.auth0_org_id === 'string' ? body.auth0_org_id : ''
  if (!auth0_org_id) {
    res.status(400).json({ error: 'auth0_org_id is required.' })
    return
  }

  const email = body.email ? body.email.toLowerCase() : null
  const phoneNumber = body.phone_number ?? null
  const full_name = body.full_name ?? ''

  // At least one identifier is guaranteed above; build the matching OR filter
  // for whichever one(s) are present.
  const identifierFilter = [
    email ? `email.eq.${email}` : null,
    phoneNumber ? `phone_number.eq.${phoneNumber}` : null,
  ]
    .filter(Boolean)
    .join(',')

  // A pending invitation establishes the role only for first enrollment. Once
  // signup accepts it, the active membership becomes the sole role source so
  // Auth0 metadata cannot change or downgrade database-authoritative access.
  const { data: invite } = await supabaseAdmin
    .from('invitations')
    .select('role')
    .eq('auth0_org_id', auth0_org_id)
    .or(identifierFilter)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const existingMember = await findActiveOrgMember(auth0_org_id, body.auth0_user_id)

  if (!invite && !existingMember) {
    res.status(403).json({ error: 'No active membership or valid invitation was found.' })
    return
  }

  // The invitation establishes the role on a user's first enrollment. Once
  // create.js has accepted that invitation, subsequent Action syncs must use
  // the existing membership role rather than the optional Auth0 metadata hint.
  // Otherwise an undefined hint is converted to "member" and demotes the
  // newly created admin before the browser reaches the onboarding guard.
  const role: AccessRole = invite ? jobRoleToTier(invite.role) : jobRoleToTier(existingMember!.role)

  const { data: identity, error: identityErr } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        auth0_user_id: body.auth0_user_id,
        auth0_org_id,
        email,
        mobile_number: phoneNumber,
        full_name,
        avatar_url: body.avatar_url ?? null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'auth0_user_id' }
    )
    .select('auth0_user_id')
    .single()

  if (identityErr || !identity) {
    res.status(500).json({ error: identityErr?.message ?? 'Failed to sync user.' })
    return
  }

  // Only identity/role fields are touched here — assignment fields
  // (department/site/shift/manager/employee_code/etc.) belong to
  // /api/org-members and are left untouched. joined_at is intentionally
  // omitted so it keeps its DB default on first insert and is never reset on
  // subsequent logins (upsert only overwrites columns present in the payload).
  const { data: member, error: memberErr } = await supabaseAdmin
    .from('org_members')
    .upsert(
      {
        auth0_org_id,
        auth0_user_id: body.auth0_user_id,
        full_name,
        role,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'auth0_org_id,auth0_user_id' }
    )
    .select('id')
    .single()
  if (memberErr || !member) {
    res.status(500).json({ error: memberErr?.message ?? 'Failed to sync membership.' })
    return
  }

  // Stamp the invite as accepted now that the membership exists.
  await supabaseAdmin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_member_id: member.id })
    .eq('auth0_org_id', auth0_org_id)
    .or(identifierFilter)
    .is('accepted_at', null)

  res.json({ ok: true, role, permissions: permissionsForRole(role) })
})

export default router

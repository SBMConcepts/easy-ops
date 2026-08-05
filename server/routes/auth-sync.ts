import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'
import { hasRequiredRole, jobRoleToTier, type AccessRole } from '../lib/rbac.js'
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
    full_name?: string
    avatar_url?: string | null
    role?: string | null
  }

  if (!body.auth0_user_id || !body.email) {
    res.status(400).json({ error: 'auth0_user_id and email are required.' })
    return
  }

  // Every user in this B2B product belongs to a tenant: users.auth0_org_id is
  // NOT NULL. Reject an orgless sync with a clean 400 rather than a DB error.
  const auth0_org_id = typeof body.auth0_org_id === 'string' ? body.auth0_org_id : ''
  if (!auth0_org_id) {
    res.status(400).json({ error: 'auth0_org_id is required.' })
    return
  }

  const email = body.email.toLowerCase()
  const full_name = body.full_name ?? ''

  const { data: identity, error: identityErr } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        auth0_user_id: body.auth0_user_id,
        auth0_org_id,
        email,
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

  // public.invitations is the real pending-invite record (public.users is
  // identity, not an invite). The invite carries the provisioning-time
  // intent — the org creator is always invited as owner/admin. Let it win
  // whenever it grants at least as much privilege as the token hint, so a
  // stale or low app_metadata role can never downgrade the creator (or any
  // invited admin) below their intended tier.
  const { data: invite } = await supabaseAdmin
    .from('invitations')
    .select('role')
    .eq('auth0_org_id', auth0_org_id)
    .eq('email', email)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let roleHint = body.role
  if (
    invite?.role &&
    (!roleHint || hasRequiredRole(jobRoleToTier(invite.role), jobRoleToTier(roleHint)))
  ) {
    roleHint = invite.role
  }

  const existingMember = await findActiveOrgMember(auth0_org_id, body.auth0_user_id)

  if (!invite && !existingMember) {
    res.json({ ok: true, role: 'admin', permissions: permissionsForRole('admin') })
    return
  }

  const role: AccessRole = jobRoleToTier(roleHint)
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
    .eq('email', email)
    .is('accepted_at', null)

  res.json({ ok: true, role, permissions: permissionsForRole(role) })
})

export default router

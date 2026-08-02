import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'
import { hasRequiredRole, jobRoleToTier, type AccessRole } from '../lib/rbac.js'
import { permissionsForRole } from '../lib/permissions.js'

const router = Router()

router.post('/api/auth/sync', async (req: Request, res: Response) => {
  const secret = process.env.AUTH0_SYNC_SECRET
  if (!secret || req.header('x-api-key') !== secret) {
    res.status(401).json({ error: 'Invalid sync credentials.' })
    return
  }

  const body = (req.body ?? {}) as {
    auth0_user_id?: string
    email?: string
    full_name?: string
    avatar_url?: string | null
    auth0_org_id?: string
    role?: string
  }

  if (!body.auth0_user_id || !body.email) {
    res.status(400).json({ error: 'auth0_user_id and email are required.' })
    return
  }

  // Every user in this B2B product belongs to a tenant: users.auth0_org_id is
  // NOT NULL. Reject an orgless sync with a clean 400 rather than a DB error.
  const auth0OrgId = typeof body.auth0_org_id === 'string' ? body.auth0_org_id : ''
  if (!auth0OrgId) {
    res.status(400).json({ error: 'auth0_org_id is required.' })
    return
  }

  // user_credentials is the tenant identity anchor: it exists independent of any
  // organization-scoped membership data and is keyed by the Auth0 subject.
  const { data: cred, error: credErr } = await supabaseAdmin
    .from('user_credentials')
    .upsert(
      {
        auth0_user_id: body.auth0_user_id,
        auth0_org_id: auth0OrgId,
        email: body.email,
        full_name: body.full_name ?? '',
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'auth0_user_id' }
    )
    .select('auth0_user_id, auth0_org_id, email, full_name')
    .single()

  if (credErr || !cred) {
    res.status(500).json({ error: credErr?.message ?? 'Failed to sync user.' })
    return
  }

  let role: AccessRole = 'admin' // default to owner/admin if no org context
  if (body.auth0_org_id) {
    let roleHint = body.role
    // public.users is the invite table. The invite carries the provisioning-
    // time intent — the org creator is always invited as owner/admin. Let it
    // win whenever it grants at least as much privilege as the token hint, so a
    // stale or low app_metadata role can never downgrade the creator (or any
    // invited admin) below their intended tier.
    const { data: invite } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth0_org_id', body.auth0_org_id)
      .eq('email', body.email.toLowerCase())
      .maybeSingle()
    if (
      invite?.role &&
      (!roleHint || hasRequiredRole(jobRoleToTier(invite.role), jobRoleToTier(roleHint)))
    ) {
      roleHint = invite.role
    }

    const { data: existingMember } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('auth0_org_id', body.auth0_org_id)
      .eq('auth0_user_id', body.auth0_user_id)
      .maybeSingle()

    if (!invite && !existingMember) {
      res.json({ ok: true, role: 'admin', permissions: permissionsForRole('admin') })
      return
    }

    role = jobRoleToTier(roleHint)
    const { error: memberErr } = await supabaseAdmin.from('org_members').upsert(
      {
        auth0_org_id: body.auth0_org_id,
        auth0_user_id: body.auth0_user_id,
        email: body.email,
        full_name: body.full_name ?? '',
        role,
        status: 'active',
      },
      { onConflict: 'auth0_org_id,auth0_user_id' }
    )
    if (memberErr) {
      res.status(500).json({ error: memberErr.message })
      return
    }

    // Stamp the invite as accepted now that the membership exists.
    await supabaseAdmin
      .from('users')
      .update({ accepted_at: new Date().toISOString() })
      .eq('auth0_org_id', body.auth0_org_id)
      .eq('email', body.email.toLowerCase())
      .is('accepted_at', null)
  }

  res.json({ ok: true, role, permissions: permissionsForRole(role) })
})

export default router

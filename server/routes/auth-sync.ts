// POST /api/auth/sync
//
// Called by the Auth0 Post-Login Action to mirror the authenticated identity
// into Supabase and resolve the caller's access tier. Authenticated with a
// shared secret header (x-api-key === AUTH0_SYNC_SECRET) since the Action runs
// server-side in Auth0, not in the browser.
//
// Returns { role } — the org_members access tier — which the Action injects as
// a namespaced custom claim on the issued token.
import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'
import { jobRoleToTier } from '../lib/rbac.js'

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
    org_id?: string
    role?: string
  }

  if (!body.auth0_user_id || !body.email) {
    res.status(400).json({ error: 'auth0_user_id and email are required.' })
    return
  }

  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        auth0_user_id: body.auth0_user_id,
        email: body.email,
        full_name: body.full_name ?? '',
        avatar_url: body.avatar_url ?? null,
        auth0_org_id: body.org_id ?? '',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'auth0_user_id' }
    )
    .select('id')
    .single()

  if (userErr || !user) {
    res.status(500).json({ error: userErr?.message ?? 'Failed to sync user.' })
    return
  }

  let role = 'admin' // default to owner/admin if no org context
  if (body.org_id) {
    // Resolve the access tier. Prefer an explicit role hint from the token, but
    // fall back to the pending invitation for this email — that is where the
    // org creator ('owner') and invited employees get their intended role.
    let roleHint = body.role
    const { data: invite } = await supabaseAdmin
      .from('invitations')
      .select('role')
      .eq('org_id', body.org_id)
      .eq('email', body.email.toLowerCase())
      .maybeSingle()
    if (invite?.role && (!roleHint || jobRoleToTier(roleHint) === 'admin')) {
      roleHint = invite.role
    }

    // Only provision/refresh a membership when the user was actually invited or
    // already belongs to the org. The connection has assign_membership_on_login
    // enabled (required for invitation signup), so without this gate any user
    // initiating org-scoped login would otherwise be auto-added as a member.
    const { data: existingMember } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('org_id', body.org_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!invite && !existingMember) {
      res.json({ ok: true, role: 'admin' })
      return
    }

    role = jobRoleToTier(roleHint)
    const { error: memberErr } = await supabaseAdmin.from('org_members').upsert(
      {
        org_id: body.org_id,
        user_id: user.id,
        role,
        status: 'active',
      },
      { onConflict: 'org_id,user_id' }
    )
    if (memberErr) {
      res.status(500).json({ error: memberErr.message })
      return
    }
  }

  res.json({ ok: true, role })
})

export default router

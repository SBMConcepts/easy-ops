import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'
import { hasRequiredRole, jobRoleToTier } from '../lib/rbac.js'

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

  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        auth0_user_id: body.auth0_user_id,
        email: body.email,
        full_name: body.full_name ?? '',
        avatar_url: body.avatar_url ?? null,
        auth0_org_id: body.auth0_org_id,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'auth0_user_id' }
    )
    .select('auth0_user_id, email, full_name, avatar_url, auth0_org_id')
    .single()

  if (userErr || !user) {
    res.status(500).json({ error: userErr?.message ?? 'Failed to sync user.' })
    return
  }

  // Reconcile the invite-time placeholder (see POST /api/invitations): now that
  // the real profile row exists, drop the 'pending|<email>' row so it does not
  // linger as a duplicate. Best-effort — a failure here must not block sync.
  await supabaseAdmin
    .from('users')
    .delete()
    .eq('auth0_user_id', `pending|${body.email.toLowerCase()}`)

  let role = 'admin' // default to owner/admin if no org context
  if (body.auth0_org_id) {
    let roleHint = body.role
    const { data: invite } = await supabaseAdmin
      .from('invitations')
      .select('role')
      .eq('auth0_org_id', body.auth0_org_id)
      .eq('email', body.email.toLowerCase())
      .maybeSingle()
    // The invitation carries the provisioning-time intent — the org creator is
    // always invited as 'owner'. Let it win whenever it grants at least as much
    // privilege as the token hint, so a stale or low app_metadata role can never
    // downgrade the creator (or any invited admin) below their intended tier.
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
      res.json({ ok: true, role: 'admin' })
      return
    }

    role = jobRoleToTier(roleHint)
    const { error: memberErr } = await supabaseAdmin.from('org_members').upsert(
      {
        auth0_org_id: body.auth0_org_id,
        auth0_user_id: body.auth0_user_id,
        role,
        status: 'active',
      },
      { onConflict: 'auth0_org_id,auth0_user_id' }
    )
    if (memberErr) {
      res.status(500).json({ error: memberErr.message })
      return
    }
  }

  res.json({ ok: true, role })
})

export default router

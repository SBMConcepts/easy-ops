// GET  /api/userinfo  — enriched profile for the current user + org.
// PUT  /api/userinfo  — update the current user's own profile.
//
// The GET response is the canonical `CurrentUserProfile` contract consumed by
// src/contexts/AuthContext.tsx and src/hooks/useCurrentUser.ts. `role` is the
// org_members access tier (owner|admin|member|viewer).
import { Router, type Response } from 'express'

import { requireAuth, requireOrg, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

router.get('/api/userinfo', requireAuth, requireOrg, async (req: AuthedRequest, res: Response) => {
  const sub = req.auth!.sub
  const orgId = req.orgId!

  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, auth0_user_id, email, full_name, avatar_url')
    .eq('auth0_user_id', sub)
    .maybeSingle()

  if (userErr) {
    res.status(500).json({ error: userErr.message })
    return
  }
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' })
    return
  }

  const [{ data: member }, { data: org }, { data: subscription }] = await Promise.all([
    supabaseAdmin
      .from('org_members')
      .select('role, status, joined_at')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('organizations')
      .select('auth0_org_id, name, slug, status, logo_url, country, industry')
      .eq('auth0_org_id', orgId)
      .maybeSingle(),
    supabaseAdmin
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  res.json({
    profile_id: user.id,
    auth0_user_id: user.auth0_user_id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    user_status: 'active',
    org_id: orgId,
    role: member?.role ?? 'viewer',
    membership_status: member?.status ?? 'suspended',
    joined_at: member?.joined_at ?? null,
    org_name: org?.name ?? '',
    org_auth0_id: orgId,
    org_status: org?.status ?? 'active',
    org_logo: org?.logo_url || null,
    org_country: org?.country ?? '',
    org_industry: org?.industry ?? '',
    plan: subscription?.plan ?? null,
    billing_status: subscription?.status ?? null,
    current_period_end: subscription?.current_period_end ?? null,
  })
})

router.put('/api/userinfo', requireAuth, async (req: AuthedRequest, res: Response) => {
  const sub = req.auth!.sub
  const body = (req.body ?? {}) as { full_name?: unknown }

  const update: { full_name?: string; last_seen_at: string } = {
    last_seen_at: new Date().toISOString(),
  }
  if (typeof body.full_name === 'string') update.full_name = body.full_name

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('auth0_user_id', sub)
    .select('id, full_name, avatar_url, email')
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json({ ok: true, profile: data })
})

export default router

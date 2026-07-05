import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const SAFE_COLUMNS = 'id, email, email_verified, status, created_at, updated_at, auth0_user_id'

const CREDENTIAL_STATUSES = new Set(['active', 'blocked', 'deleted'])

const router = Router()

router.get('/api/user-credentials/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('user_credentials')
    .select(SAFE_COLUMNS)
    .eq('auth0_user_id', req.auth!.sub)
    .maybeSingle()
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: 'No credential record found for this user.' })
    return
  }
  res.json(data)
})

router.patch(
  '/api/user-credentials/:auth0UserId/status',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const targetUserId = String(req.params.auth0UserId)
    const body = (req.body ?? {}) as { status?: string }
    if (!body.status || !CREDENTIAL_STATUSES.has(body.status)) {
      res.status(400).json({ error: 'status must be one of: active, blocked, deleted.' })
      return
    }

    // Resolve the target from the users table (the source of truth for a
    // person's identity/data), scoped to the caller's org. user_credentials is
    // then updated from that, and the membership status is propagated to
    // org_members afterwards (users -> user_credentials -> org_members).
    const { data: member } = await supabaseAdmin
      .from('users')
      .select('auth0_user_id')
      .eq('auth0_user_id', targetUserId)
      .eq('auth0_org_id', req.orgId!)
      .maybeSingle()
    if (!member) {
      res.status(404).json({ error: 'User not found in this organization.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('user_credentials')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('auth0_user_id', targetUserId)
      .select(SAFE_COLUMNS)
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'No credential record found for this user.' })
      return
    }

    // Propagate the credential status to the membership. A blocked/deleted
    // credential suspends org access; an active credential restores it.
    const memberStatus = body.status === 'active' ? 'active' : 'suspended'
    await supabaseAdmin
      .from('org_members')
      .update({ status: memberStatus })
      .eq('auth0_org_id', req.orgId!)
      .eq('auth0_user_id', targetUserId)

    res.json(data)
  }
)

export default router

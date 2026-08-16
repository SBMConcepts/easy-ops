import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

router.get(
  '/api/subscriptions',
  requireAuth,
  requireOrg,
  requirePermission('read:subscriptions'),
  async (req: AuthedRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id, auth0_org_id, plan, status, current_period_end, trial_ends_at, created_at')
      .eq('auth0_org_id', req.orgId!)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'No subscription found for this organization.' })
      return
    }
    res.json(data)
  }
)

export default router

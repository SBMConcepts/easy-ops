// GET /api/tenants — the current caller's organization.
import { Router, type Response } from 'express'

import { requireAuth, requireOrg, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

router.get('/api/tenants', requireAuth, requireOrg, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('auth0_org_id, name, slug, plan, status, industry, country, logo_url, created_at')
    .eq('auth0_org_id', req.orgId!)
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: 'Organization not found.' })
    return
  }
  res.json(data)
})

export default router

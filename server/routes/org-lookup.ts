// GET /api/org-lookup?slug=<slug>|?email=<email>
//
// Public, pre-auth helper that resolves an Auth0 organization id so the login
// flow can pass `organization` to Auth0. Returns 404 when no match is found.
// Never leaks more than the minimum needed to start an org-scoped login.
import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

router.get('/api/org-lookup', async (req: Request, res: Response) => {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : ''

  if (!slug && !email) {
    res.status(400).json({ error: 'Provide a slug or email query parameter.' })
    return
  }

  if (slug) {
    const { data } = await supabaseAdmin
      .from('organizations')
      .select('auth0_org_id, name, slug')
      .eq('slug', slug)
      .maybeSingle()
    if (data) {
      res.json({ auth0_org_id: data.auth0_org_id, name: data.name, slug: data.slug })
      return
    }
  }

  if (email) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('auth0_org_id')
      .eq('email', email)
      .maybeSingle()
    if (user?.auth0_org_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('auth0_org_id, name, slug')
        .eq('auth0_org_id', user.auth0_org_id)
        .maybeSingle()
      if (org) {
        res.json({ auth0_org_id: org.auth0_org_id, name: org.name, slug: org.slug })
        return
      }
    }
  }

  res.status(404).json({ error: 'No organization found for the provided identifier.' })
})

export default router

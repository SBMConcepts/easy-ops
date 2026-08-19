import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()

router.get('/api/org-lookup', async (req: Request, res: Response) => {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : ''
  const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : ''

  if (!slug && !email && !phone) {
    res.status(400).json({ error: 'Provide a slug, email, or phone query parameter.' })
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

  if (email || phone) {
    // public.users is keyed by (auth0_org_id, email/mobile_number), NOT
    // globally unique on either — the same identifier can hold invites across
    // multiple orgs. Take the most recent invite rather than .maybeSingle(),
    // which errors on >1 row.
    let query = supabaseAdmin
      .from('users')
      .select('auth0_org_id')
      .order('created_at', { ascending: false })
      .limit(1)
    query = email ? query.eq('email', email) : query.eq('mobile_number', phone)
    const { data: invites } = await query
    const orgId = invites?.[0]?.auth0_org_id
    if (orgId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('auth0_org_id, name, slug')
        .eq('auth0_org_id', orgId)
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

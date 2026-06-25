// POST /api/tenants/create — public organization intake.
//
// Creates the Auth0 organization (source of the auth0_org_id primary key),
// mirrors it into Supabase, seeds a subscription, and emails an organization
// invitation to the admin. No auth required (pre-signup intake).
import { Router, type Request, type Response } from 'express'

import { supabaseAdmin } from '../lib/supabase-admin.js'
import { createAuth0Org, createOrgInvitation } from '../lib/auth0-admin.js'

const router = Router()

// organizations.plan CHECK allows only these values; anything else falls back to
// 'free'. The requested plan is still recorded on the subscription row (free text).
const ORG_PLANS = new Set(['free', 'starter', 'pro', 'enterprise'])

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

router.post('/api/tenants/create', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { orgName?: string; adminEmail?: string; plan?: string }
  const orgName = typeof body.orgName === 'string' ? body.orgName.trim() : ''
  const adminEmail = typeof body.adminEmail === 'string' ? body.adminEmail.trim().toLowerCase() : ''
  const requestedPlan = typeof body.plan === 'string' ? body.plan : 'free'

  if (!orgName || !adminEmail) {
    res.status(400).json({ error: 'orgName and adminEmail are required.' })
    return
  }

  const slug = slugify(orgName) || `org-${Date.now()}`
  const orgPlan = ORG_PLANS.has(requestedPlan) ? requestedPlan : 'free'

  try {
    const auth0Org = await createAuth0Org(orgName, slug)

    const { error: orgErr } = await supabaseAdmin.from('organizations').upsert(
      {
        auth0_org_id: auth0Org.id,
        name: orgName,
        slug,
        plan: orgPlan,
        status: 'active',
      },
      { onConflict: 'auth0_org_id' }
    )
    if (orgErr) throw new Error(orgErr.message)

    await supabaseAdmin.from('subscriptions').insert({
      org_id: auth0Org.id,
      plan: requestedPlan,
      status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    })

    const clientId = process.env.AUTH0_CLIENT_ID
    let invitationId: string | null = null
    if (clientId) {
      invitationId =
        (await createOrgInvitation({
          orgId: auth0Org.id,
          inviterName: orgName,
          inviteeEmail: adminEmail,
          clientId,
        })) ?? null
    }

    res.status(201).json({ orgId: auth0Org.id, slug, invitationId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Organization creation failed.'
    console.error('tenants/create failed:', message)
    res.status(500).json({ error: message })
  }
})

export default router

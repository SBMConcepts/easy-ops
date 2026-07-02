import { Router, type Request, type Response } from 'express'

import { requireAuth, requireOrg, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { createAuth0Org, createOrgInvitation, enableOrgConnection } from '../lib/auth0-admin.js'

const router = Router()

const ORG_PLANS = new Set(['free', 'starter', 'pro', 'enterprise'])

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

router.post('/api/organizations', async (req: Request, res: Response) => {
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

    await enableOrgConnection(auth0Org.id)

    const { error: orgErr } = await supabaseAdmin.from('organizations').upsert(
      {
        auth0_org_id: auth0Org.id,
        name: orgName,
        slug,
        plan: orgPlan,
        status: 'provisioning',
      },
      { onConflict: 'auth0_org_id' }
    )
    if (orgErr) throw new Error(orgErr.message)

    const { error: inviteErr } = await supabaseAdmin
      .from('invitations')
      .upsert(
        { org_id: auth0Org.id, email: adminEmail, role: 'owner' },
        { onConflict: 'org_id,email' }
      )
    if (inviteErr) throw new Error(inviteErr.message)

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
    console.error('organizations/create failed:', message)
    res.status(500).json({ error: message })
  }
})

router.get(
  '/api/organizations',
  requireAuth,
  requireOrg,
  async (req: AuthedRequest, res: Response) => {
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
  }
)

export default router

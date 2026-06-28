// Organization intake + lookup for the current caller.
//
//   POST /api/organizations  — public intake: create the Auth0 organization
//                              (source of the auth0_org_id primary key), mirror
//                              it into Supabase, seed a subscription, and email
//                              an organization invitation to the admin.
//   GET  /api/organizations  — the authenticated caller's organization.
import { Router, type Request, type Response } from 'express'

import { requireAuth, requireOrg, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { createAuth0Org, createOrgInvitation } from '../lib/auth0-admin.js'

const router = Router()

// organizations.plan allows only these values; anything else falls back to
// 'free'. The requested plan is still recorded on the subscription row.
const ORG_PLANS = new Set(['free', 'starter', 'pro', 'enterprise'])

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

// Public pre-signup intake — no auth required.
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

    // Record the creator as the organization owner so that, on their first
    // login, /api/auth/sync resolves their access tier from this invitation
    // (instead of defaulting to 'viewer') and they land in the onboarding flow
    // with full admin capabilities.
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

// The authenticated caller's organization.
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

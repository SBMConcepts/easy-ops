import { Router, type Request, type Response } from 'express'

import { requireAuth, requireOrg, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import {
  auth0RolesForAccessRole,
  createAuth0Org,
  createOrgInvitation,
  deleteAuth0Org,
  enableOrgConnection,
} from '../lib/auth0-admin.js'
import type { Database } from '../types/supabase.js'
import { E164_RE } from '../lib/phone.js'

const router = Router()

type OrgPlan = Database['public']['Enums']['org_plan']
const ORG_PLANS = new Set<OrgPlan>(['free', 'starter', 'growth', 'pro', 'enterprise'])

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

router.post('/api/organizations', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as {
    orgName?: string
    adminEmail?: string
    plan?: string
    mobileNumber?: string
  }
  const orgName = typeof body.orgName === 'string' ? body.orgName.trim() : ''
  const adminEmail = typeof body.adminEmail === 'string' ? body.adminEmail.trim().toLowerCase() : ''
  const requestedPlan = typeof body.plan === 'string' ? body.plan : 'free'
  const mobileNumber = typeof body.mobileNumber === 'string' ? body.mobileNumber.trim() : ''

  if (!orgName || !adminEmail) {
    res.status(400).json({ error: 'orgName and adminEmail are required.' })
    return
  }
  if (mobileNumber && !E164_RE.test(mobileNumber)) {
    res.status(400).json({ error: 'mobileNumber must be in E.164 format, e.g. +27821234567.' })
    return
  }

  const slug = slugify(orgName) || `org-${Date.now()}`
  const orgPlan: OrgPlan = ORG_PLANS.has(requestedPlan as OrgPlan)
    ? (requestedPlan as OrgPlan)
    : 'free'
  const clientId = process.env.AUTH0_CLIENT_ID

  let adminRoles: string[]
  try {
    adminRoles = auth0RolesForAccessRole('admin')
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Auth0 organization admin role is unavailable.'
    res.status(503).json({ error: message })
    return
  }

  if (!clientId) {
    res.status(503).json({
      error: 'Auth0 client is not configured; the administrator invitation cannot be sent.',
    })
    return
  }

  let createdOrgId: string | null = null
  try {
    const auth0Org = await createAuth0Org(orgName, slug)
    createdOrgId = auth0Org.id

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

    // Seed the org creator as a pending invitation (public.invitations is the
    // real invite table; public.users is identity/profile, not invites).
    // The role carried here is what /api/auth/sync reads back to provision
    // the owning membership when the creator completes signup.
    const { error: inviteErr } = await supabaseAdmin.from('invitations').insert({
      auth0_org_id: auth0Org.id,
      email: adminEmail,
      phone_number: mobileNumber || null,
      role: 'admin',
    })
    if (inviteErr) throw new Error(inviteErr.message)

    const isFreePlan = orgPlan === 'free'
    const { error: subscriptionErr } = await supabaseAdmin.from('subscriptions').insert({
      auth0_org_id: auth0Org.id,
      plan: orgPlan,
      status: isFreePlan ? 'active' : 'trialing',
      billing_state: isFreePlan ? 'free' : 'pending_payment_method',
    })
    if (subscriptionErr) throw new Error(subscriptionErr.message)

    const invitationId = await createOrgInvitation({
      orgId: auth0Org.id,
      inviterName: orgName,
      inviteeEmail: adminEmail,
      clientId,
      roles: adminRoles,
    })
    if (!invitationId) {
      throw new Error('Auth0 did not return an administrator invitation id.')
    }

    res.status(201).json({ orgId: auth0Org.id, slug, invitationId })
  } catch (err) {
    if (createdOrgId) {
      const cleanup = await Promise.allSettled([
        (async () => {
          const { error } = await supabaseAdmin
            .from('organizations')
            .delete()
            .eq('auth0_org_id', createdOrgId!)
          if (error) throw new Error(error.message)
        })(),
        deleteAuth0Org(createdOrgId),
      ])
      const cleanupFailures = cleanup.filter((result) => result.status === 'rejected')
      if (cleanupFailures.length > 0) {
        console.error('organizations/create cleanup failed:', cleanupFailures)
      }
    }
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

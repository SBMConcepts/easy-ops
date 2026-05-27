/**
 * POST /api/tenants/create
 *
 * 1. Creates an Auth0 organisation (Management API)
 * 2. Inserts a tenant row in Supabase (tenants table)
 * 3. Creates the admin user in Auth0 and assigns them the "admin" role
 * 4. Sends an onboarding email via Auth0's invitation flow
 *
 * Expected request body:
 *   { orgName: string, adminEmail: string, plan: 'starter' | 'growth' | 'enterprise' }
 *
 * Returns:
 *   { auth0OrgId: string, tenantId: string }
 */

import { Router } from 'express' // swap for your framework
import { ManagementClient } from 'auth0'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const router = Router()

// ── Clients ──────────────────────────────────────────────────────────────────

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
})

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service-role key — backend only!
)

// ── Helper: slugify org name for Auth0 org identifier ────────────────────────

function toOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/api/tenants/create', async (req, res) => {
  const { orgName, adminEmail, plan } = req.body as {
    orgName?: string
    adminEmail?: string
    plan?: string
  }

  if (!orgName || !adminEmail || !plan) {
    return res.status(400).json({ message: 'orgName, adminEmail, and plan are required.' })
  }

  const slug = toOrgSlug(orgName)
  const tenantId = randomUUID()

  try {
    // ── Step 1: Create Auth0 organisation ──────────────────────────────────
    const org = await auth0.organizations.create({
      name: slug,
      display_name: orgName,
      metadata: {
        plan,
        tenantId, // link back to your Supabase row
      },
    })

    const auth0OrgId: string = org.data.id

    // ── Step 2: Insert tenant row in Supabase ──────────────────────────────
    const { error: insertError } = await supabase.from('tenants').insert({
      id: tenantId,
      name: orgName,
      slug,
      plan,
      auth0_org_id: auth0OrgId,
      admin_email: adminEmail,
      status: 'pending_onboarding',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      // Roll back Auth0 org to keep state consistent
      await auth0.organizations.delete({ id: auth0OrgId }).catch(() => null)
      throw new Error(`Supabase insert failed: ${insertError.message}`)
    }

    // ── Step 3: Create Auth0 invitation (sends onboarding email) ──────────
    // This generates a magic link the admin clicks to set their password,
    // then lands them in /app/onboarding where they complete the workspace setup.
    await auth0.organizations.createInvitation(
      { id: auth0OrgId },
      {
        inviter: { name: 'EasyOps' },
        invitee: { email: adminEmail },
        client_id: process.env.AUTH0_CLIENT_ID!,
        roles: [process.env.AUTH0_ADMIN_ROLE_ID!], // pre-assign admin role
        send_invitation_email: true,
        ttl_sec: 60 * 60 * 72, // 72-hour expiry
        app_metadata: {
          tenantId,
          auth0OrgId,
          plan,
          isFirstAdmin: true,
        },
      }
    )

    return res.status(201).json({ auth0OrgId, tenantId })
  } catch (err: unknown) {
    console.error('[POST /api/tenants/create]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ message })
  }
})

export default router

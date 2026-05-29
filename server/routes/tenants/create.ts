import { Router } from 'express'
import { ManagementClient } from 'auth0'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const router = Router()

type Plan = 'starter' | 'growth' | 'enterprise'
const PLAN_VALUES: Plan[] = ['starter', 'growth', 'enterprise']

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
})

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function toOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

router.post('/api/tenants/create', async (req, res) => {
  const { orgName, adminEmail, plan } = req.body as {
    orgName?: string
    adminEmail?: string
    plan?: Plan | string
  }

  if (!orgName || !adminEmail || !plan) {
    return res.status(400).json({ message: 'orgName, adminEmail, and plan are required.' })
  }

  if (!PLAN_VALUES.includes(plan as Plan)) {
    return res.status(400).json({ message: `plan must be one of: ${PLAN_VALUES.join(', ')}` })
  }

  const normalizedPlan = plan as Plan
  const slug = toOrgSlug(orgName)
  const tenantId = randomUUID()

  try {
    // 1) Create Auth0 org (LET Auth0 generate the org identifier)
    const org = await auth0.organizations.create({
      name: slug, // display identifier in Auth0 UI
      display_name: orgName,
      metadata: {
        plan: normalizedPlan,
        tenantId,
      },
      // IMPORTANT: do NOT set `id:` here, so org.data.id is the true org_id used in JWT
    })

    const auth0OrgId: string = org.data.id

    // 2) Insert tenant row in Supabase (MATCHES verifyAuth0Token expectations)
    const { error: insertError } = await supabase.from('tenants').insert({
      id: tenantId,
      auth0_org_id: auth0OrgId, // must equal JWT org_id
      slug,
      name: orgName,
      status: 'provisioning',
      country: 'South Africa',
      settings: {},
      plan: normalizedPlan,
    })

    if (insertError) {
      await auth0.organizations.delete(auth0OrgId).catch(() => null)
      throw new Error(`Supabase insert failed: ${insertError.message}`)
    }

    // 3) Create Auth0 invitation email for the admin
    await auth0.organizations.invitations.create(auth0OrgId, {
      inviter: { name: 'EasyOps' },
      invitee: { email: adminEmail },
      client_id: process.env.AUTH0_CLIENT_ID!, // required for invitation flow
      roles: [process.env.AUTH0_ADMIN_ROLE_ID!],
      send_invitation_email: true,
      ttl_sec: 60 * 60 * 72,
      app_metadata: {
        tenantId,
        auth0OrgId,
        plan: normalizedPlan,
        isFirstAdmin: true,
      },
    })

    return res.status(201).json({ auth0OrgId, tenantId })
  } catch (err: unknown) {
    console.error('[POST /api/tenants/create]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ message })
  }
})

export default router

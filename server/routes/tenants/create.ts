import { Router } from 'express'
import { ManagementClient } from 'auth0'
import { createClient } from '@supabase/supabase-js'

const router = Router()

type Plan = 'starter' | 'growth' | 'enterprise'

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
})

// Uses the secure backend Service Role Key to bypass RLS during initial tenant setup
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

router.post('/api/tenants/create', async (req, res) => {
  const { orgName, adminEmail, plan } = req.body as {
    orgName?: string
    adminEmail?: string
    plan?: string
  }

  if (!orgName || !adminEmail || !plan) {
    return res.status(400).json({ message: 'orgName, adminEmail, and plan are required.' })
  }

  try {
    // 1. Create the Organization in Auth0
    const { data: org } = await auth0.organizations.create({
      name: orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50), // Auth0 internal structural name
      display_name: orgName,
    })
    const auth0OrgId = org.id

    // 2. Insert tenant shell in Supabase (Slug-free)
    const { data: tenant, error: insertError } = await supabase
      .from('tenants')
      .insert({
        auth0_org_id: auth0OrgId, // This is the master key that binds the JWT to the DB
        name: orgName,
        status: 'provisioning',
        country: 'South Africa',
        settings: {},
        plan: plan,
      })
      .select('id')
      .single()

    if (insertError) throw new Error(insertError.message)

    // 3. Dispatch the Auth0 Admin Invitation
    await auth0.organizations.invitations.create(auth0OrgId, {
      inviter: { name: 'EasyOps Setup' },
      invitee: { email: adminEmail },
      client_id: process.env.AUTH0_CLIENT_ID!,
      roles: [process.env.AUTH0_ADMIN_ROLE_ID!],
      send_invitation_email: true,
      app_metadata: { role: 'admin' },
    })

    res.status(201).json({ success: true, orgId: auth0OrgId })
  } catch (error: unknown) {
    console.error('Tenant creation failed:', (error as Error).message)
    res.status(500).json({ error: 'Failed to provision workspace.' })
  }
})

export default router

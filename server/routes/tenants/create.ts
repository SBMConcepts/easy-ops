import { Router, type Request, type Response } from 'express'
import { ManagementClient } from 'auth0'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth0Token } from '../../lib/auth.js'

const router = Router()

type Plan = 'starter' | 'growth' | 'pro' | 'enterprise'

// Lazily initialised so env vars are guaranteed loaded before first use
let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured')
    // Uses the secure backend Service Role Key to bypass RLS during initial tenant setup
    _supabase = createClient(url, key)
  }
  return _supabase
}

router.post('/api/tenants/create', async (req: Request, res: Response) => {
  try {
    const authCtx = await verifyAuth0Token(req)
    if (!authCtx) {
      return res.status(401).json({ error: 'Unauthorized security context.' })
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized security context.' })
  }

  const { orgName, adminEmail, plan } = req.body as {
    orgName?: string
    adminEmail?: string
    plan?: string
  }

  if (!orgName || !adminEmail || !plan) {
    return res.status(400).json({ message: 'orgName, adminEmail, and plan are required.' })
  }

  try {
    const auth0 = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
      clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
    })

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
    const supabase = getSupabase()
    const { data: tenant, error: insertError } = await supabase
      .from('tenants')
      .insert({
        auth0_org_id: auth0OrgId, // This is the master key that binds the JWT to the DB
        name: orgName,
        status: 'provisioning',
        country: 'South Africa',
        settings: {},
      })
      .select('id')
      .single()

    if (insertError) throw new Error(insertError.message)

    // 2b. Create the initial subscription row — plan lives here, not on tenants
    const { error: subError } = await supabase.from('subscriptions').insert({
      tenant_id: tenant.id,
      plan: plan as Plan,
      status: 'trialing',
    })

    if (subError) throw new Error(subError.message)

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

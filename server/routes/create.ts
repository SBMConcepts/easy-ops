/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from 'express'
import { ManagementClient } from 'auth0'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '../types/supabase.js'

const router = Router()

// Strongly typed from your database definitions
type Plan = Database['public']['Enums']['billing_plan']
const PLAN_VALUES: Plan[] = ['starter', 'growth', 'pro', 'enterprise']

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
})

// Strongly typed Supabase Client
const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

router.post('/api/tenants/create', async (req: Request, res: Response): Promise<any> => {
  const { orgName, adminEmail, plan } = req.body as {
    orgName?: string
    adminEmail?: string
    plan?: Plan | string
  }

  if (!orgName || !adminEmail || !plan) {
    return res.status(400).json({ message: 'orgName, adminEmail, and plan are required.' })
  }

  const normalizedPlan = plan.toLowerCase() as Plan
  if (!PLAN_VALUES.includes(normalizedPlan)) {
    return res
      .status(400)
      .json({ message: `Invalid plan tier. Choose from: ${PLAN_VALUES.join(', ')}` })
  }

  const tenantId = randomUUID()

  try {
    const auth0InternalName =
      orgName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) || `org-${Date.now()}`

    const org = await auth0.organizations.create({
      name: auth0InternalName,
      display_name: orgName,
    })

    const auth0OrgId = org.data.id

    // TypeScript will now instantly throw an error here if `plan` or `status` aren't exact enum matches
    const { error: insertError } = await supabaseAdmin.from('tenants').insert({
      id: tenantId,
      auth0_org_id: auth0OrgId,
      name: orgName,
      slug: auth0InternalName,
      status: 'active',
      country: '',
    })

    if (insertError) {
      await auth0.organizations.delete(auth0OrgId).catch(() => null)
      throw new Error(`Supabase insert failed: ${insertError.message}`)
    }

    await auth0.organizations.invitations.create(auth0OrgId, {
      inviter: { name: 'EasyOps Engine' },
      invitee: { email: adminEmail },
      client_id: process.env.AUTH0_CLIENT_ID!,
      roles: [process.env.AUTH0_ADMIN_ROLE_ID!],
      send_invitation_email: true,
      ttl_sec: 60 * 60 * 72,
      app_metadata: {
        tenantId,
        auth0OrgId,
        plan: normalizedPlan,
      },
    })

    return res.status(201).json({ success: true, tenantId, auth0OrgId })
  } catch (error: any) {
    console.error('Error during tenant creation:', error)
    return res.status(500).json({ error: error.message || 'Internal crash.' })
  }
})

export default router

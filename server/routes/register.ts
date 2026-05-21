/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express'
import type { Request, Response } from 'express'
import { ManagementClient } from 'auth0'
import { getPool } from '../lib/db.js'
import crypto from 'crypto'

const router = Router()

/**
 * POST /api/auth/register
 *
 * Provisions Auth0 + Supabase entities atomically.
 */
router.post('/', async (req: Request, res: Response) => {
  const { companyName, companySlug, adminEmail, password } = req.body as {
    companyName?: string
    companySlug?: string
    adminEmail?: string
    password?: string
  }

  if (!companyName || !companySlug || !adminEmail || !password) {
    res.status(400).json({ error: 'Missing registration payload inputs' })
    return
  }

  const slug = companySlug.toLowerCase().trim()

  // ── Phase A: Auth0 provisioning ─────────────────────────────────────────
  const auth0 = new ManagementClient({
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
  })

  try {
    const auth0Org = await auth0.organizations.create({
      name: slug,
      display_name: companyName,
    })

    const auth0User = await auth0.users.create({
      email: adminEmail,
      password: password,
      connection: 'Username-Password-Authentication',
    })

    await auth0.organizations.members.add(
      { id: auth0Org.id },
      { members: [{ user_id: auth0User.user_id! }] }
    )
    // ── Phase B: Postgres Provisioning ────────────────────────────────────
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // 1. Create the Tenant
      const tenantId = crypto.randomUUID()
      await client.query(
        `INSERT INTO public.tenants (id, name, slug, auth0_org_id) 
         VALUES ($1, $2, $3, $4)`,
        [tenantId, companyName, slug, auth0Org.id]
      )

      // 2. Upsert the Global User (In case they already exist from another tenant)
      const userId = crypto.randomUUID()
      const userUpsert = await client.query(
        `INSERT INTO public.users (id, auth0_user_id, email, full_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (auth0_user_id) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [userId, auth0User.user_id, adminEmail, `${companyName} Admin`]
      )
      const finalLocalUserId = userUpsert.rows[0].id

      // 3. Create the B2B Tenant Membership (Access & RBAC)
      await client.query(
        `INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, 'owner'::app_role, 'active')`,
        [tenantId, finalLocalUserId]
      )

      // 4. Create the Employee Profile (HR logic: Job Titles, ID Numbers)
      await client.query(
        `INSERT INTO public.employee_profiles (tenant_id, user_id, job_title)
         VALUES ($1, $2, 'Platform Administrator')`,
        [tenantId, finalLocalUserId]
      )

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        workspace: `${slug}.easy-ops-za.vercel.app`,
      })
    } catch (dbErr: unknown) {
      await client.query('ROLLBACK')
      console.error('Registration Database Error:', dbErr)
      // Note: A compensating saga should delete the Auth0 Org/User here in production
      res.status(500).json({ error: 'Database provisioning failed.' })
    } finally {
      client.release()
    }
  } catch (authErr: any) {
    console.error('Registration Auth0 Error:', authErr)
    res.status(500).json({ error: 'Identity provisioning failed.' })
  }
})

export default router

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express'
import type { Request, Response } from 'express'
import { ManagementClient } from 'auth0'
import { getPool } from '../lib/db.js'
import crypto from 'crypto'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const { companyName, companySlug, adminEmail, password, subscriptionPlan } = req.body as {
    companyName?: string
    companySlug?: string
    adminEmail?: string
    password?: string
    subscriptionPlan?: string
  }

  if (!companyName || !companySlug || !adminEmail || !password || !subscriptionPlan) {
    res.status(400).json({ error: 'Missing registration payload inputs' })
    return
  }

  const slug = companySlug.toLowerCase().trim()

  const auth0 = new ManagementClient({
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
  })

  try {
    const { data: auth0Org } = await auth0.organizations.create({
      name: slug,
      display_name: companyName,
    })

    const { data: auth0User } = await auth0.users.create({
      email: adminEmail,
      password: password,
      connection: 'Username-Password-Authentication',
    })

    await auth0.organizations.members.create(auth0Org.id, {
      members: [auth0User.user_id!],
    })

    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const tenantInsert = await client.query(
        `INSERT INTO public.tenants (name, slug, auth0_org_id, plan, status)
         VALUES ($1, $2, $3, $4, 'provisioning')
         RETURNING id`,
        [companyName, slug, auth0Org.id, subscriptionPlan || 'starter']
      )

      const tenantId = tenantInsert.rows[0].id

      const userUpsert = await client.query(
        `INSERT INTO public.users (id, auth0_user_id, email, full_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [crypto.randomUUID(), auth0User.user_id, adminEmail, `${companyName} Admin`]
      )

      const finalLocalUserId = userUpsert.rows[0].id

      await client.query(
        `INSERT INTO public.memberships (tenant_id, user_id, role, status, invited_by, joined_at)
         VALUES ($1, $2, 'admin'::public.tenant_role, 'active', $1, now())`,
        [tenantId, finalLocalUserId]
      )

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        workspace: `${process.env.VITE_APP_URL ?? 'http://localhost:5173'}/t/${slug}/app`,
        subscriptionPlan,
      })
    } catch (dbErr: unknown) {
      await client.query('ROLLBACK')
      console.error('Registration Database Error:', dbErr)
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

import { Router } from 'express'
import type { Request, Response } from 'express'
import { ManagementClient } from 'auth0'
import { getPool } from '../lib/db.js'

const router = Router()

/**
 * POST /api/auth/register
 *
 * Two-phase enrollment pipeline:
 *   A) Provision Auth0 organisation + admin user
 *   B) Persist org, profile, and role to Supabase via a pooled PostgreSQL
 *      transaction (bypasses Supabase Auth entirely)
 *
 * On DB failure the transaction is rolled back. Auth0 entities created in
 * phase A are logged for out-of-band cleanup (production should enqueue a
 * compensating saga to delete them).
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

  let auth0OrgId: string
  let auth0UserId: string

  try {
    const orgRes = await auth0.organizations.create({
      name: slug,
      display_name: companyName,
    })
    auth0OrgId = orgRes.data.id

    const userRes = await auth0.users.create({
      email: adminEmail,
      password,
      connection: 'Username-Password-Authentication',
    })
    auth0UserId = userRes.data.user_id!

    await auth0.organizations.members({ id: auth0OrgId }, { members: [auth0UserId] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Auth0 provisioning failed'
    console.error('Auth0 provisioning error:', err)
    res.status(500).json({ error: msg })
    return
  }

  // ── Phase B: Persist to Supabase via pooled PostgreSQL transaction ──────
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    // 1. Create the organisation row (slug column added by migration 20260520000000)
    const orgResult = await client.query<{ id: string }>(
      `INSERT INTO public.organisations (name, slug, auth0_org_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [companyName, slug, auth0OrgId]
    )
    const orgId = orgResult.rows[0].id

    // 2. Create the admin profile.
    //    auth0_user_id stores the Auth0 sub so future requests can resolve
    //    the internal UUID from the JWT (migration 20260521000000 adds this column).
    const profileId: string = crypto.randomUUID()
    await client.query(
      `INSERT INTO public.profiles (id, organisation_id, full_name, email, auth0_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [profileId, orgId, `${companyName} Admin`, adminEmail, auth0UserId]
    )

    // 3. Back-fill created_by now that we have the profile UUID
    await client.query(`UPDATE public.organisations SET created_by = $1 WHERE id = $2`, [
      profileId,
      orgId,
    ])

    // 4. Grant admin role using the internal profile UUID (not the Auth0 sub)
    await client.query(
      `INSERT INTO public.user_roles (user_id, organisation_id, organisation_roles)
       VALUES ($1, $2, 'admin'::app_role)`,
      [profileId, orgId]
    )

    await client.query('COMMIT')

    res.status(201).json({
      success: true,
      workspace: `${slug}.easy-ops-za.vercel.app`,
    })
  } catch (dbErr: unknown) {
    await client.query('ROLLBACK')
    // TODO (production): enqueue compensating saga to delete auth0OrgId + auth0UserId
    console.error('DB transaction error (Auth0 entities may be orphaned):', dbErr)
    const msg = dbErr instanceof Error ? dbErr.message : 'Enrollment pipeline failure'
    res.status(500).json({ error: msg })
  } finally {
    client.release()
  }
})

export default router

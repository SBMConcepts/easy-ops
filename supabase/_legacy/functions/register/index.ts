/**
 * Public self-service tenant registration endpoint.
 *
 * POST /functions/v1/register
 * Body: { companyName, companySlug, adminEmail, password }
 *
 * No auth token required — this creates the first admin user for a new tenant.
 *
 * Steps:
 *  1. Validate inputs
 *  2. Create Auth0 organisation
 *  3. Create Auth0 user with the supplied credentials
 *  4. Add user as a member of the Auth0 org
 *  5. Write organisation, profile, and user_roles rows to Supabase
 *  6. Stamp Auth0 app_metadata with role + organisation_id
 *  7. Return the new workspace URL
 *
 * On any failure after step 2, best-effort Auth0 cleanup is attempted.
 */
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get: (key: string) => string | undefined
  }
}

// ── Auth0 Management API helpers ─────────────────────────────────────────────

async function getAuth0MgmtToken(
  domain: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
  })
  if (!res.ok) throw new Error(`Auth0 token error: ${await res.text()}`)
  const { access_token } = await res.json()
  return access_token as string
}

async function createAuth0Org(
  domain: string,
  token: string,
  slug: string,
  displayName: string
): Promise<string> {
  const res = await fetch(`https://${domain}/api/v2/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: slug, display_name: displayName }),
  })
  if (!res.ok) throw new Error(`Auth0 org create error: ${await res.text()}`)
  const { id } = await res.json()
  return id as string
}

async function createAuth0User(
  domain: string,
  token: string,
  email: string,
  password: string,
  fullName: string
): Promise<string> {
  const res = await fetch(`https://${domain}/api/v2/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      email,
      password,
      name: fullName,
      connection: 'Username-Password-Authentication',
    }),
  })
  if (!res.ok) throw new Error(`Auth0 user create error: ${await res.text()}`)
  const { user_id } = await res.json()
  return user_id as string
}

async function addAuth0OrgMember(
  domain: string,
  token: string,
  orgId: string,
  userId: string
): Promise<void> {
  const res = await fetch(`https://${domain}/api/v2/organizations/${orgId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ members: [userId] }),
  })
  if (!res.ok) throw new Error(`Auth0 add member error: ${await res.text()}`)
}

async function setAuth0AppMetadata(
  domain: string,
  token: string,
  userId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ app_metadata: metadata }),
  })
  if (!res.ok) throw new Error(`Auth0 metadata error: ${await res.text()}`)
}

/** Best-effort cleanup — called if the DB write fails after Auth0 entities exist. */
async function cleanupAuth0(
  domain: string,
  token: string,
  orgId: string | null,
  userId: string | null
): Promise<void> {
  try {
    if (userId) {
      await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    if (orgId) {
      await fetch(`https://${domain}/api/v2/organizations/${orgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  } catch (e) {
    console.error('Auth0 cleanup error (non-fatal):', e)
  }
}

// ── Slug helper (mirrors organisation-setup) ─────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

// ── Response helper ───────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let auth0OrgId: string | null = null
  let auth0UserId: string | null = null
  let mgmtToken: string | null = null
  let auth0Domain: string | undefined

  try {
    const body = await req.json().catch(() => null)
    if (!body) return jsonResponse({ error: 'Invalid JSON body' }, 400)

    const {
      companyName,
      companySlug: rawSlug,
      adminEmail,
      password,
    } = body as Record<string, string>

    // ── Input validation ──────────────────────────────────────────────────
    if (!companyName?.trim()) return jsonResponse({ error: 'companyName is required' }, 400)
    if (!adminEmail?.trim()) return jsonResponse({ error: 'adminEmail is required' }, 400)
    if (!password) return jsonResponse({ error: 'password is required' }, 400)

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail.trim())) {
      return jsonResponse({ error: 'adminEmail must be a valid email address' }, 400)
    }
    if (password.length < 8) {
      return jsonResponse({ error: 'password must be at least 8 characters' }, 400)
    }

    // Derive slug from the provided value or fall back to company name
    const slug = rawSlug ? toSlug(rawSlug) : toSlug(companyName)
    if (!slug)
      return jsonResponse({ error: 'Could not derive a valid slug from company name' }, 400)

    // ── Env vars ──────────────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    auth0Domain = Deno.env.get('AUTH0_DOMAIN')
    const auth0ClientId = Deno.env.get('AUTH0_MGMT_CLIENT_ID')
    const auth0ClientSecret = Deno.env.get('AUTH0_MGMT_CLIENT_SECRET')

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // ── Guard: slug must be unique ────────────────────────────────────────
    const { data: existing } = await supabase
      .from('organisations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return jsonResponse(
        { error: 'This company slug is already taken. Please choose a different name.' },
        409
      )
    }

    // ── Step 1: Auth0 provisioning ────────────────────────────────────────
    if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
      return jsonResponse({ error: 'Auth0 configuration missing on server' }, 500)
    }

    mgmtToken = await getAuth0MgmtToken(auth0Domain, auth0ClientId, auth0ClientSecret)

    auth0OrgId = await createAuth0Org(auth0Domain, mgmtToken, slug, companyName.trim())
    auth0UserId = await createAuth0User(
      auth0Domain,
      mgmtToken,
      adminEmail.trim().toLowerCase(),
      password,
      companyName.trim() + ' Admin'
    )

    await addAuth0OrgMember(auth0Domain, mgmtToken, auth0OrgId, auth0UserId)

    // ── Step 2: Database writes ───────────────────────────────────────────
    // Insert organisation
    const { data: org, error: orgErr } = await supabase
      .from('organisations')
      .insert({
        name: companyName.trim(),
        slug,
        auth0_org_id: auth0OrgId,
        onboarding_completed: false,
        created_by: auth0UserId,
      })
      .select('id')

    if (orgErr || !org || org.length === 0) {
      await cleanupAuth0(auth0Domain, mgmtToken, auth0OrgId, auth0UserId)
      return jsonResponse(
        { error: 'Failed to create organisation record', details: orgErr?.message },
        500
      )
    }

    const orgId: string = org?.[0]?.id

    // Insert admin profile
    const { error: profileErr } = await supabase.from('profiles').insert({
      organisation_id: orgId,
      full_name: companyName.trim() + ' Admin',
      email: adminEmail.trim().toLowerCase(),
      auth0_user_id: auth0UserId,
    })

    if (profileErr) {
      console.error('Profile insert error (non-fatal, continuing):', profileErr)
    }

    // Assign admin role
    const { error: roleErr } = await supabase.from('user_roles').insert({
      user_id: auth0UserId,
      organisation_id: orgId,
      organisation_roles: 'admin',
    })

    if (roleErr) {
      console.error('Role insert error (non-fatal, continuing):', roleErr)
    }

    // ── Step 3: Stamp Auth0 app_metadata ─────────────────────────────────
    await setAuth0AppMetadata(auth0Domain, mgmtToken, auth0UserId, {
      role: 'admin',
      organisation_id: orgId,
    })

    // ── Audit log ─────────────────────────────────────────────────────────
    await supabase.from('audit_log').insert({
      user_id: auth0UserId,
      action: 'tenant_registered',
      target_table: 'organisations',
      target_id: orgId,
      details: { company_name: companyName.trim(), slug, auth0_org_id: auth0OrgId },
    })

    return jsonResponse(
      {
        success: true,
        organisation_id: orgId,
        workspace: `https://${slug}.easy-ops-za.vercel.app`,
      },
      201
    )
  } catch (err) {
    console.error('Registration error:', err)

    // Best-effort Auth0 cleanup when DB write fails
    if (auth0Domain && mgmtToken && (auth0OrgId || auth0UserId)) {
      const domain = Deno.env.get('AUTH0_DOMAIN')!
      await cleanupAuth0(domain, mgmtToken, auth0OrgId, auth0UserId)
    }

    return jsonResponse({ error: (err as Error).message || 'Registration failed' }, 500)
  }
})

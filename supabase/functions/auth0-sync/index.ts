// functions/auth0-sync/index.ts
type TenantRole = 'admin' | 'manager' | 'supervisor' | 'employee'

function mapAuthRoleToTenantRole(input: unknown): TenantRole {
  // Expect roles like: ["admin"] or ["manager"] etc.
  const roleStr = Array.isArray(input)
    ? (input.find((r) => typeof r === 'string') as string | undefined)
    : typeof input === 'string'
      ? input
      : undefined

  const r = (roleStr ?? '').toLowerCase()
  if (r === 'admin') return 'admin'
  if (r === 'manager') return 'manager'
  if (r === 'supervisor') return 'supervisor'
  return 'employee'
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const apiKey = req.headers.get('x-api-key')
  const expected = Deno.env.get('AUTH0_SYNC_API_KEY')
  if (!expected || !apiKey || apiKey !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return new Response('Invalid JSON', { status: 400 })

  const { auth0UserId, email, fullName, avatarUrl, orgId, roles } = body as {
    auth0UserId?: string
    email?: string
    fullName?: string
    avatarUrl?: string | null
    orgId?: string | null
    roles?: unknown
  }

  if (!auth0UserId || typeof auth0UserId !== 'string') {
    return new Response('Missing or invalid auth0UserId', { status: 400 })
  }
  if (!email || typeof email !== 'string') {
    return new Response('Missing or invalid email', { status: 400 })
  }

  if (!orgId || typeof orgId !== 'string') {
    return new Response('Missing or invalid orgId (tenant UUID)', { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response('Server misconfigured (missing Supabase env vars)', { status: 500 })
  }

  const nowIso = new Date().toISOString()
  const role: TenantRole = mapAuthRoleToTenantRole(roles)

  // 1) Upsert user by auth0_user_id
  const upsertUserRes = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([
      {
        id: auth0UserId,
        auth0_user_id: auth0UserId,
        email,
        full_name: typeof fullName === 'string' ? fullName : '',
        avatar_url: avatarUrl ?? null,
        updated_at: nowIso,
        created_at: nowIso,
      },
    ]),
  })

  if (!upsertUserRes.ok) {
    const text = await upsertUserRes.text().catch(() => '')
    return new Response(`User upsert failed: ${upsertUserRes.status} ${text}`, { status: 500 })
  }

  // 2) Upsert membership for tenant (create if missing)
  const insertMembershipRes = await fetch(`${supabaseUrl}/rest/v1/memberships`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([
      {
        // your memberships.id is a uuid with default, so we can omit it
        tenant_id: orgId,
        user_id: auth0UserId,
        role,
        status: 'active',
        updated_at: nowIso,
        joined_at: nowIso,
      },
    ]),
  })

  if (!insertMembershipRes.ok) {
    const text = await insertMembershipRes.text().catch(() => '')
    return new Response(`Membership upsert failed: ${insertMembershipRes.status} ${text}`, {
      status: 500,
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})

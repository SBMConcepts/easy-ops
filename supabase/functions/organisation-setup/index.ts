import { createClient } from 'npm:@supabase/supabase-js@2'

// ── Auth0 Management API helpers ─────────────────────────────────────────────

/** URL-safe slug derived from a display name (max 50 chars). */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

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
  if (!res.ok) throw new Error(`Auth0 token request failed: ${await res.text()}`)
  const { access_token } = await res.json()
  return access_token as string
}

async function createAuth0Organization(
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
  if (!res.ok) throw new Error(`Auth0 org creation failed: ${await res.text()}`)
  const { id } = await res.json()
  return id as string
}

async function addAuth0OrgMember(
  domain: string,
  token: string,
  auth0OrgId: string,
  userId: string
) {
  const res = await fetch(`https://${domain}/api/v2/organizations/${auth0OrgId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ members: [userId] }),
  })
  if (!res.ok) throw new Error(`Auth0 add member failed: ${await res.text()}`)
}

async function setAuth0AppMetadata(
  domain: string,
  token: string,
  userId: string,
  metadata: Record<string, unknown>
) {
  const res = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ app_metadata: metadata }),
  })
  if (!res.ok) throw new Error(`Auth0 metadata update failed: ${await res.text()}`)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SiteInput {
  name: string
  address?: string
  latitude?: number
  longitude?: number
  geofence_radius_m?: number
}

interface DepartmentInput {
  name: string
  site_index: number // references index in sites array
}

interface RoleInput {
  name: string
  base_role: 'admin' | 'manager' | 'supervisor' | 'employee'
}

interface ShiftInput {
  name: string
  start_time: string
  end_time: string
  grace_period_minutes: number
  site_index: number
}

interface OnboardingPayload {
  company: {
    name: string
    industry?: string
    country: string
    logo_url?: string
  }
  sites: SiteInput[]
  departments: DepartmentInput[]
  roles: RoleInput[]
  shifts: ShiftInput[]
  settings: {
    check_in_methods: string[]
    geofencing_enabled: boolean
    default_geofence_radius: number
    max_weekly_hours: number
    overtime_multiplier: number
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Allow if user is already admin OR has no organisation yet (first-time setup).
    // New signups get 'employee' by default via trigger, so we can't require
    // admin role before the org exists — that's a chicken-and-egg problem.
    const [roleRes, profileRes] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).single(),
      supabaseAdmin.from('profiles').select('organisation_id').eq('id', user.id).single(),
    ])

    const isAdmin = roleRes.data?.role === 'admin'
    const hasNoOrg = !profileRes.data?.organisation_id

    if (!isAdmin && !hasNoOrg) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    const payload: OnboardingPayload = await req.json()

    // Validate required fields
    if (!payload.company?.name || !payload.sites?.length) {
      return new Response(
        JSON.stringify({
          error: 'Company name and at least one site are required',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // 1. Create organisation
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organisations')
      .insert({
        name: payload.company.name,
        industry: payload.company.industry || null,
        country: payload.company.country || 'South Africa',
        logo_url: payload.company.logo_url || null,
        onboarding_completed: true,
        settings: payload.settings || {},
        created_by: user.id,
      })
      .select('id')
      .single()

    if (orgError || !org) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create organisation',
          details: orgError?.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const orgId = org.id

    // 2. Insert sites
    const sitesPayload = payload.sites.map((s) => ({
      name: s.name,
      address: s.address || null,
      latitude: s.latitude || null,
      longitude: s.longitude || null,
      geofence_radius_m: s.geofence_radius_m || payload.settings?.default_geofence_radius || 200,
      organisation_id: orgId,
    }))

    const { data: insertedSites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .insert(sitesPayload)
      .select('id')

    if (sitesError) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create sites',
          details: sitesError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // 3. Insert departments
    if (payload.departments?.length) {
      const deptsPayload = payload.departments.map((d) => ({
        name: d.name,
        site_id: insertedSites?.[d.site_index]?.id || null,
        organisation_id: orgId,
      }))

      const { error: deptsError } = await supabaseAdmin.from('departments').insert(deptsPayload)
      if (deptsError) {
        console.error('Departments error:', deptsError)
      }
    }

    // 4. Insert shifts
    if (payload.shifts?.length) {
      const shiftsPayload = payload.shifts.map((s) => ({
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time,
        grace_period_minutes: s.grace_period_minutes || 15,
        site_id: insertedSites?.[s.site_index]?.id || null,
        organisation_id: orgId,
      }))

      const { error: shiftsError } = await supabaseAdmin.from('shifts').insert(shiftsPayload)
      if (shiftsError) {
        console.error('Shifts error:', shiftsError)
      }
    }

    // 5. Insert organisation roles
    if (payload.roles?.length) {
      const rolesPayload = payload.roles.map((r) => ({
        name: r.name,
        base_role: r.base_role,
        organisation_id: orgId,
      }))

      const { error: rolesError } = await supabaseAdmin
        .from('organisation_roles')
        .insert(rolesPayload)
      if (rolesError) {
        console.error('Roles error:', rolesError)
      }
    }

    // 6. Update admin's profile with organisation_id
    await supabaseAdmin.from('profiles').update({ organisation_id: orgId }).eq('id', user.id)

    // 7. Elevate user to admin role (new signups default to 'employee')
    await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id)
    await supabaseAdmin.from('user_roles').insert({ user_id: user.id, role: 'admin' })

    // 8. Auth0 double-write: create org, add member, stamp app_metadata
    // This runs after all DB writes succeed so a DB failure never leaves
    // orphaned Auth0 state.  Auth0 env vars are optional — if absent the
    // function degrades gracefully (DB write still committed).
    let auth0OrgId: string | null = null
    const auth0Domain = Deno.env.get('AUTH0_DOMAIN')
    const auth0ClientId = Deno.env.get('AUTH0_MGMT_CLIENT_ID')
    const auth0ClientSecret = Deno.env.get('AUTH0_MGMT_CLIENT_SECRET')

    if (auth0Domain && auth0ClientId && auth0ClientSecret) {
      try {
        const mgmtToken = await getAuth0MgmtToken(auth0Domain, auth0ClientId, auth0ClientSecret)
        const slug = toSlug(payload.company.name)
        auth0OrgId = await createAuth0Organization(
          auth0Domain,
          mgmtToken,
          slug,
          payload.company.name
        )

        // user.id is the Auth0 sub when Auth0 JWTs are passed to Supabase
        await addAuth0OrgMember(auth0Domain, mgmtToken, auth0OrgId, user.id)
        await setAuth0AppMetadata(auth0Domain, mgmtToken, user.id, {
          role: 'admin',
          organisation_id: orgId,
        })

        // Persist the Auth0 org ID so we can reference it later
        await supabaseAdmin
          .from('organisations')
          .update({ auth0_org_id: auth0OrgId })
          .eq('id', orgId)
      } catch (auth0Err) {
        // Log but don't fail the request — the DB is consistent
        console.error('Auth0 double-write error:', auth0Err)
      }
    }

    // 9. Audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'organisation_setup_completed',
      target_table: 'organisations',
      target_id: orgId,
      details: {
        company_name: payload.company.name,
        sites_count: payload.sites.length,
        auth0_org_id: auth0OrgId,
      },
    })

    return new Response(
      JSON.stringify({ success: true, organisation_id: orgId, auth0_org_id: auth0OrgId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

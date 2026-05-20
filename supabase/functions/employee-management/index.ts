/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { resolveAuthContext, requireRole } from '../_shared/auth-middleware.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const VALID_ROLES = ['admin', 'manager', 'supervisor', 'employee']

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!['GET', 'PUT'].includes(req.method)) {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid authorization header' }, 401)
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    // ── Resolve caller role + organisation in parallel ───────────────────
    const [roleRes, profileRes] = await Promise.all([
      supabaseAdmin.from('user_roles').select('organisation_roles').eq('user_id', user.id).single(),
      supabaseAdmin.from('profiles').select('organisation_id').eq('id', user.id).single(),
    ])

    const callerRole = roleRes.data?.organisation_roles
    const organisationId = profileRes.data?.organisation_id

    if (!organisationId) {
      return jsonResponse(
        {
          error: 'User has no organisation. Complete onboarding first.',
        },
        403
      )
    }
    if (!callerRole || !['admin', 'manager'].includes(callerRole)) {
      return jsonResponse({ error: 'Forbidden: admin or manager role required' }, 403)
    }

    // ── GET: list employees scoped to this organisation ──────────────────
    if (req.method === 'GET') {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select(
          `
    id,
    full_name,
    email,
    created_at,
    department:departments!profiles_department_id_fkey(name),
    site:sites!profiles_profile_site_id_fkey(name)
  `
        )
        .eq('organisation_id', organisationId)
        .order('full_name')

      if (profilesError) {
        console.error('employee-management GET error:', profilesError)
        return jsonResponse(
          {
            error: 'Failed to fetch employees',
            details: profilesError.message,
          },
          500
        )
      }

      // Fetch roles separately — avoids cross-schema FK join
      const userIds = (profiles ?? []).map((p: any) => p.id)
      const roleMap: Record<string, string> = {}

      if (userIds.length) {
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, organisation_roles')
          .in('user_id', userIds)

        for (const r of roles ?? []) roleMap[r.user_id] = r.organisation_roles
      }

      const employees = (profiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        department: p.department?.name ?? null,
        site: p.site?.name ?? null,
        role: roleMap[p.id] ?? 'employee',
        created_at: p.created_at,
      }))

      return jsonResponse({ employees })
    }

    // ── PUT: update an employee (admin only) ─────────────────────────────
    if (callerRole !== 'admin') {
      return jsonResponse({ error: 'Forbidden: admin role required to update employees' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { user_id, full_name, department_id, profile_site_id, role: newRole } = body as any

    if (!user_id || typeof user_id !== 'string' || !isValidUUID(user_id)) {
      return jsonResponse({ error: 'user_id must be a valid UUID' }, 400)
    }

    // Verify target belongs to the same organisation
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .eq('organisation_id', organisationId)
      .single()

    if (!targetProfile) {
      return jsonResponse({ error: 'Employee not found in your organisation' }, 404)
    }

    // Admins cannot demote themselves
    if (user_id === user.id && newRole && newRole !== 'admin') {
      return jsonResponse({ error: 'Admins cannot change their own role' }, 400)
    }

    // ── Build validated profile updates ──────────────────────────────────
    const updates: Record<string, unknown> = {}

    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || full_name.trim().length === 0) {
        return jsonResponse({ error: 'full_name must be a non-empty string' }, 400)
      }
      if (full_name.trim().length > 150) {
        return jsonResponse({ error: 'full_name must not exceed 150 characters' }, 400)
      }
      updates.full_name = full_name.trim()
    }

    if (department_id !== undefined) {
      if (typeof department_id !== 'string' || !isValidUUID(department_id)) {
        return jsonResponse({ error: 'department_id must be a valid UUID' }, 400)
      }
      updates.department_id = department_id
    }

    if (profile_site_id !== undefined) {
      if (typeof profile_site_id !== 'string' || !isValidUUID(profile_site_id)) {
        return jsonResponse({ error: 'profile_site_id must be a valid UUID' }, 400)
      }
      updates.profile_site_id = profile_site_id
    }

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', user_id)

      if (profileError) {
        console.error('employee-management profile update error:', profileError)
        return jsonResponse(
          {
            error: 'Failed to update employee profile',
            details: profileError.message,
          },
          500
        )
      }
    }

    // ── Update role if provided ──────────────────────────────────────────
    if (newRole !== undefined) {
      if (!VALID_ROLES.includes(newRole)) {
        return jsonResponse(
          {
            error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
          },
          400
        )
      }
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id)
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id, organisation_roles: newRole })

      if (roleError) {
        console.error('employee-management role update error:', roleError)
        return jsonResponse(
          {
            error: 'Failed to update employee role',
            details: roleError.message,
          },
          500
        )
      }
    }

    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      organisation_id: organisationId,
      action: 'update_employee',
      target_table: 'profiles',
      target_id: user_id,
      details: { updates, new_role: newRole ?? null },
    })

    return jsonResponse({ success: true })
  } catch (err) {
    console.error('employee-management unhandled error:', err)
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500)
  }
})

import { createClient } from '@supabase/supabase-js'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get: (key: string) => string | undefined
  }
}
interface InvitePayload {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'supervisor' | 'employee'
  department?: string
  site?: string
}

const VALID_ROLES = ['admin', 'manager', 'supervisor', 'employee']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401)
    }

    // Validate caller using anon client + their JWT
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    // Service-role client for admin operations
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Confirm caller is admin
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('organisation_roles')
      .eq('user_id', user.id)
      .eq('organisation_roles', 'admin')
      .maybeSingle()
    if (!roleRow) return json({ error: 'Admin role required' }, 403)

    // Caller's organisation
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
    const organisation_id = callerProfile?.[0]?.organisation_id ?? null

    const body = (await req.json()) as InvitePayload
    const email = (body.email || '').trim().toLowerCase()
    const full_name = (body.full_name || '').trim()
    const role = body.role

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Valid email required' }, 400)
    }
    if (!full_name) return json({ error: 'Full name required' }, 400)
    if (!VALID_ROLES.includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }

    const redirectTo = `${req.headers.get('origin') ?? new URL(req.url).origin}/reset-password`

    // Send invite (creates auth user if not exists)
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      redirectTo,
    })

    if (inviteErr || !inviteData?.user) {
      return json({ error: inviteErr?.message || 'Failed to invite user' }, 400)
    }

    const newUserId = inviteData.user.id

    // Upsert profile (the trigger may have already created it)
    await admin.from('profiles').upsert(
      {
        id: newUserId,
        full_name,
        email,
        organisation_id,
      },
      { onConflict: 'id' }
    )

    // Replace role(s) with the requested one
    await admin.from('user_roles').delete().eq('user_id', newUserId)
    await admin.from('user_roles').insert({ user_id: newUserId, organisation_roles: role })

    // Audit log
    await admin.from('audit_log').insert({
      user_id: user.id,
      action: 'invite_employee',
      target_table: 'profiles',
      target_id: newUserId,
      details: { email, full_name, role, organisation_id },
    })

    return json({ success: true, user_id: newUserId })
  } catch (e) {
    console.error('invite-employee error', e)
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

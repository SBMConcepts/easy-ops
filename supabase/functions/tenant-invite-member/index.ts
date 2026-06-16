import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json', accept: '*/*' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: { ...corsHeaders, accept: '*/*' } })

  try {
    const {
      email,
      fullName,
      role = 'employee',
      departmentId = null,
      siteId = null,
    } = await req.json()
    if (!email || !fullName) throw new Error('email and fullName are required.')

    const normalizedEmail = String(email).trim().toLowerCase()

    // Verify the caller and that they may invite into their active tenant.
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const {
      data: { user: caller },
      error: authError,
    } = await authClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized security context.' }), {
        status: 401,
        headers: jsonHeaders,
      })
    }

    const { data: callerMembership } = await authClient
      .from('memberships')
      .select('tenant_id, role')
      .eq('user_id', caller.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (!callerMembership || !['owner', 'admin', 'manager'].includes(callerMembership.role)) {
      return new Response(JSON.stringify({ error: 'You cannot invite members.' }), {
        status: 403,
        headers: jsonHeaders,
      })
    }
    const tenantId = callerMembership.tenant_id

    // Service role performs the privileged provisioning + auth invite.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const redirectTo = `${Deno.env.get('PUBLIC_SITE_URL') ?? ''}/reset-password`
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo, data: { full_name: fullName } }
    )
    if (inviteError || !invite?.user) {
      // If the user already exists, fall back to resolving their id so we can
      // still attach the membership.
      const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle()
      if (!existing) throw inviteError ?? new Error('Failed to invite member.')
      invite!.user = { id: existing.id } as { id: string }
    }
    const invitedUserId = invite!.user.id

    await admin
      .from('users')
      .upsert(
        { id: invitedUserId, email: normalizedEmail, full_name: fullName },
        { onConflict: 'id' }
      )

    const { data: membership, error: membershipError } = await admin
      .from('memberships')
      .upsert(
        {
          tenant_id: tenantId,
          user_id: invitedUserId,
          role,
          status: 'invited',
          invited_by: caller.id,
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,user_id' }
      )
      .select('id')
      .single()
    if (membershipError) throw membershipError

    if (departmentId || siteId) {
      await admin.from('employee_profiles').upsert(
        {
          membership_id: membership.id,
          tenant_id: tenantId,
          department_id: departmentId,
          site_id: siteId,
        },
        { onConflict: 'membership_id' }
      )
    }

    return new Response(JSON.stringify({ success: true, userId: invitedUserId }), {
      status: 201,
      headers: jsonHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders })
  }
})

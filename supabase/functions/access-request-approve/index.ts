import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json', accept: '*/*' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: { ...corsHeaders, accept: '*/*' } })

  try {
    const { requestId, email, role = 'employee' } = await req.json()
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing requestId' }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    // Authenticate the approver and resolve their active tenant + role.
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const {
      data: { user: approver },
      error: authError,
    } = await authClient.auth.getUser()
    if (authError || !approver) {
      return new Response(JSON.stringify({ error: 'Unauthorized security context.' }), {
        status: 401,
        headers: jsonHeaders,
      })
    }

    const { data: approverMembership } = await authClient
      .from('memberships')
      .select('tenant_id, role')
      .eq('user_id', approver.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (!approverMembership || !['owner', 'admin', 'manager'].includes(approverMembership.role)) {
      return new Response(JSON.stringify({ error: 'You cannot approve access requests.' }), {
        status: 403,
        headers: jsonHeaders,
      })
    }
    const tenantId = approverMembership.tenant_id

    // Service role performs the privileged provisioning.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Resolve the request and the email to invite (RLS already let the approver
    // see it; the service-role read here is the source of truth).
    const { data: request, error: requestError } = await admin
      .from('access_requests')
      .select('id, requester_email, status, target_tenant_id')
      .eq('id', requestId)
      .single()
    if (requestError || !request) throw requestError ?? new Error('Access request not found.')
    if (request.status !== 'pending') throw new Error('This request is no longer pending.')

    const inviteeEmail = String(email ?? request.requester_email)
      .trim()
      .toLowerCase()

    // Create the auth user (emails a set-password link) and link the membership.
    const redirectTo = `${Deno.env.get('PUBLIC_SITE_URL') ?? ''}/reset-password`
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      inviteeEmail,
      { redirectTo }
    )
    let invitedUserId: string
    if (inviteError || !invite?.user) {
      const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('email', inviteeEmail)
        .maybeSingle()
      if (!existing) throw inviteError ?? new Error('Failed to invite the requester.')
      invitedUserId = existing.id
    } else {
      invitedUserId = invite.user.id
    }

    await admin
      .from('users')
      .upsert(
        { id: invitedUserId, email: inviteeEmail, full_name: inviteeEmail },
        { onConflict: 'id' }
      )

    const { error: membershipError } = await admin.from('memberships').upsert(
      {
        tenant_id: tenantId,
        user_id: invitedUserId,
        role,
        status: 'invited',
        invited_by: approver.id,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,user_id' }
    )
    if (membershipError) throw membershipError

    const { error: updateError } = await admin
      .from('access_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders })
  }
})

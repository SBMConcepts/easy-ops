import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

async function getAuth0ManagementToken() {
  const res = await fetch(`https://${Deno.env.get('AUTH0_DOMAIN')}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('AUTH0_MANAGEMENT_CLIENT_ID'),
      client_secret: Deno.env.get('AUTH0_MANAGEMENT_CLIENT_SECRET'),
      audience: `https://${Deno.env.get('AUTH0_DOMAIN')}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  })
  const data = await res.json()
  return data.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, fullName, role, orgId } = await req.json()

    // 1. Dispatch structural invite payload details via Auth0 Management API
    const token = await getAuth0ManagementToken()
    const inviteRes = await fetch(
      `https://${Deno.env.get('AUTH0_DOMAIN')}/api/v2/organizations/${orgId}/invitations`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviter: { name: 'EasyOps System Cloud' },
          invitee: { email },
          client_id: Deno.env.get('AUTH0_CLIENT_ID'),
          send_invitation_email: true,
          app_metadata: { role },
        }),
      }
    )

    if (!inviteRes.ok) throw new Error('Auth0 Management API dispatch validation failure.')

    // 2. Pre-stage records inside local database tables
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({ email, full_name: fullName })
      .select()
      .single()
    if (userErr) throw userErr

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { requesterEmail, requesterName, targetTenantId, emailDomain, message } = await req.json()

    if (!requesterEmail || !emailDomain) {
      return new Response(JSON.stringify({ error: 'Missing required inputs.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('access_requests')
      .insert({
        requester_email: requesterEmail.trim(),
        requester_name: requesterName?.trim(),
        target_tenant_id: targetTenantId || null,
        email_domain: emailDomain.toLowerCase().trim(),
        message: message?.trim(),
        status: 'pending',
      })
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data }), {
      status: 201,
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

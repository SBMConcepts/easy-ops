import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orgName, adminEmail, plan } = await req.json()
    if (!orgName || !adminEmail) throw new Error('Missing payload parameters.')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Seed configuration metadata safely bypassing regular RLS parameters
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name: orgName,
        status: 'provisioning',
        plan: plan || 'starter',
        settings: { features: ['attendance', 'scheduling'] },
      })
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, tenantId: tenant.id }), {
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

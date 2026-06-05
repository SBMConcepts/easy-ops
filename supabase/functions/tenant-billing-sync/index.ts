import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  try {
    const { stripeCustomerId, status, planTier, auth0OrgId } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase
      .from('tenants')
      .update({
        plan: planTier,
        status: status === 'active' ? 'active' : 'suspended',
        settings: { stripe_customer_id: stripeCustomerId, sync_at: new Date().toISOString() },
      })
      .eq('auth0_org_id', auth0OrgId)

    if (error) throw error
    return new Response(JSON.stringify({ updated: true }), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})

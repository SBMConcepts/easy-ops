import { createClient } from '@supabase/supabase-js'

// Billing webhook sync (e.g. Stripe → Supabase). Plan/billing state lives on the
// subscriptions row that backs the tenant_active_plan view; the tenant only
// tracks lifecycle status. Identified by tenantId (no Auth0 org mapping).
Deno.serve(async (req) => {
  try {
    const { tenantId, stripeCustomerId, stripeSubscriptionId, status, planTier } = await req.json()
    if (!tenantId) throw new Error('tenantId is required.')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const billingStatus =
      status === 'active' ? 'active' : status === 'past_due' ? 'past_due' : 'canceled'

    const { error: subError } = await supabase.from('subscriptions').upsert(
      {
        tenant_id: tenantId,
        plan: planTier,
        status: billingStatus,
        stripe_customer_id: stripeCustomerId ?? null,
        stripe_subscription_id: stripeSubscriptionId ?? null,
      },
      { onConflict: 'tenant_id' }
    )
    if (subError) throw subError

    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ status: status === 'active' ? 'active' : 'suspended' })
      .eq('id', tenantId)
    if (tenantError) throw tenantError

    return new Response(JSON.stringify({ updated: true }), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})

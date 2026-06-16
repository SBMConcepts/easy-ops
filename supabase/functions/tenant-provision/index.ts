import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// Turns a company name into a URL-safe slug. tenants.slug is NOT NULL and
// unique, so we suffix collisions with a short random token.
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
  return base || `org-${Date.now()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: { ...corsHeaders, accept: '*/*' } })

  try {
    const { orgName, adminEmail, plan } = await req.json()
    if (!orgName || !adminEmail) throw new Error('Missing payload parameters.')

    const normalizedEmail = String(adminEmail).trim().toLowerCase()
    const selectedPlan = (plan as string) || 'starter'

    // Service role: this is a public, unauthenticated signup endpoint, so it
    // must bootstrap the tenant, subscription, admin auth user and membership
    // while bypassing RLS. Each step rolls back the previous one on failure.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Create the tenant (slug is unique; retry once with a random suffix).
    let slug = slugify(orgName)
    let tenantId: string | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from('tenants')
        .insert({ name: orgName, slug, status: 'provisioning' })
        .select('id')
        .single()
      if (!error) {
        tenantId = data.id
        break
      }
      if (error.code === '23505') {
        slug = `${slugify(orgName)}-${crypto.randomUUID().slice(0, 6)}`
        continue
      }
      throw error
    }
    if (!tenantId) throw new Error('Could not allocate a unique workspace slug.')

    // 2. Seed the subscription row that backs the tenant_active_plan view.
    const { error: subError } = await supabase.from('subscriptions').insert({
      tenant_id: tenantId,
      plan: selectedPlan,
      status: 'trialing',
    })
    if (subError) {
      await supabase.from('tenants').delete().eq('id', tenantId)
      throw subError
    }

    // 3. Invite the admin. This creates the auth user and emails a set-password
    //    link. The handle_new_user() trigger inserts the public.users row and
    //    activates the matching invited membership on first sign-in.
    const redirectTo = `${Deno.env.get('PUBLIC_SITE_URL') ?? ''}/reset-password`
    const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo, data: { full_name: orgName } }
    )
    if (inviteError || !invite?.user) {
      await supabase.from('subscriptions').delete().eq('tenant_id', tenantId)
      await supabase.from('tenants').delete().eq('id', tenantId)
      throw inviteError ?? new Error('Failed to invite the workspace admin.')
    }

    const adminUserId = invite.user.id

    // 4. Ensure the public.users row exists, then create the admin membership as
    //    'invited' (activated by the first-login trigger).
    await supabase
      .from('users')
      .upsert({ id: adminUserId, email: normalizedEmail, full_name: orgName }, { onConflict: 'id' })

    const { error: membershipError } = await supabase.from('memberships').insert({
      tenant_id: tenantId,
      user_id: adminUserId,
      role: 'admin',
      status: 'invited',
      invited_by: adminUserId,
      joined_at: new Date().toISOString(),
    })
    if (membershipError) {
      await supabase.auth.admin.deleteUser(adminUserId).catch(() => null)
      await supabase.from('subscriptions').delete().eq('tenant_id', tenantId)
      await supabase.from('tenants').delete().eq('id', tenantId)
      throw membershipError
    }

    return new Response(JSON.stringify({ success: true, tenantId }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', accept: '*/*' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', accept: '*/*' },
    })
  }
})

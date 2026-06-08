/**
 * Public tenant-lookup edge function.
 *
 * GET /functions/v1/tenant-lookup?slug=acme
 *
 * Returns the minimal organisation record needed by the frontend to kick off
 * an Auth0 org-scoped login.  No auth token required — the response contains
 * only non-sensitive public fields.
 */
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const slug = new URL(req.url).searchParams.get('slug')?.toLowerCase().trim()

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing required query parameter: slug' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate slug format to prevent injection
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
    return new Response(JSON.stringify({ error: 'Invalid slug format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('organisations')
    .select('id, name, auth0_org_id')
    .eq('slug', slug)

  if (error || !data || data.length === 0) {
    return new Response(JSON.stringify({ error: 'Tenant not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      id: data?.[0]?.id,
      name: data?.[0]?.name,
      auth0_org_id: data?.[0]?.auth0_org_id,
      slug,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

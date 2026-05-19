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
    Deno.env.get('VITE_SUPABASE_URL')!,
    Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Derive slug from company name using the same toSlug logic as organisation-setup
  // organisations don't have a slug column yet — match on the stored auth0_org slug
  // by comparing the slugified name. We store the slug as auth0_org_id prefix, so
  // we query organisations where lower(regexp_replace(name,'[^a-zA-Z0-9]+','-','g'))
  // matches. Simplest: expose a generated slug column via RPC or match name directly.
  // For now: the organisation-setup function stores name as-is; we derive slug on read.
  const { data, error } = await supabase
    .from('organisations')
    .select('id, name, auth0_org_id')
    .filter(
      'auth0_org_id',
      'like',
      // auth0 org names are exactly the slug we stored; match prefix before any suffix
      `${slug}%`
    )
    .limit(1)
    .single()

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Tenant not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      id: data.id,
      name: data.name,
      auth0_org_id: data.auth0_org_id,
      slug,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

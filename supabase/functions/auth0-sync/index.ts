import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== Deno.env.get('AUTH0_SYNC_SECRET')) {
      return new Response(JSON.stringify({ error: 'Unauthorized sync token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { auth0UserId, email, name, avatarUrl } = await req.json()
    if (!auth0UserId || !email) {
      return new Response(JSON.stringify({ error: 'Missing core profile payload bindings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          auth0_user_id: auth0UserId,
          email: email.toLowerCase().trim(),
          full_name: name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'auth0_user_id' }
      )
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, user: data }), {
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

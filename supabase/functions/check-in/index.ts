import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { method, siteId, latitude, longitude } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthenticated user instance.')

    // Determine attendance tracking configuration attributes
    const now = new Date()
    const timeString = now.toTimeString().split(' ')[0]
    const status = timeString > '08:15:00' ? 'late' : 'present'

    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        clock_in: now.toISOString(),
        status: status,
        method: method || 'manual',
        site_id: siteId || null,
        metadata: { lat: latitude, lng: longitude },
      })
      .select()
      .single()

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

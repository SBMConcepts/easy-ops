import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  try {
    const { siteId, locationScopeTolerance } = await req.json()
    const cryptoToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 1000 * 5).toISOString() // 5-minute validity window

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await supabase.from('secure_terminal_beacons').insert({
      site_id: siteId,
      token_hash: cryptoToken,
      expires_at: expiresAt,
      tolerance_meters: locationScopeTolerance || 50,
    })

    return new Response(JSON.stringify({ qrPayloadToken: cryptoToken, validUntil: expiresAt }), {
      status: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})

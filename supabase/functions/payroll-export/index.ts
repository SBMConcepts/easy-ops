import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { startDate, endDate } = await req.json()
    if (!startDate || !endDate) throw new Error('Missing target cycle frame bindings.')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('user_id, hours_worked')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error

    // Compute metrics
    const aggregation: Record<string, { regularHours: number; overtimeHours: number }> = {}
    records.forEach((rec) => {
      if (!aggregation[rec.user_id])
        aggregation[rec.user_id] = { regularHours: 0, overtimeHours: 0 }
      const hours = rec.hours_worked || 0
      if (hours > 8) {
        aggregation[rec.user_id].regularHours += 8
        aggregation[rec.user_id].overtimeHours += hours - 8
      } else {
        aggregation[rec.user_id].regularHours += hours
      }
    })

    return new Response(JSON.stringify({ cycle: { startDate, endDate }, data: aggregation }), {
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

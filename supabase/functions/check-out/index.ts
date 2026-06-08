import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
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

    const todayStr = new Date().toISOString().split('T')[0]

    // Fetch active open shifts
    const { data: activeRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .is('clock_out', null)
      .maybeSingle()

    if (fetchError || !activeRecord) {
      throw new Error('No active open shift found for this operator today.')
    }

    const clockInTime = new Date(activeRecord.clock_in)
    const clockOutTime = new Date()
    const hoursWorked = (
      (clockOutTime.getTime() - clockInTime.getTime()) /
      (1000 * 60 * 60)
    ).toFixed(2)

    const { data, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        clock_out: clockOutTime.toISOString(),
        hours_worked: parseFloat(hoursWorked),
      })
      .eq('id', activeRecord.id)
      .select()

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, data }), {
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

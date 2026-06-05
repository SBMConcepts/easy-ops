import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const format = url.searchParams.get('format') || 'json'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    let query = supabase
      .from('attendance_records')
      .select(`id, date, clock_in, clock_out, status, hours_worked, method`)
      .order('date', { ascending: false })

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data, error } = await query
    if (error) throw error

    if (format === 'csv') {
      let csvContent = 'ID,Date,Clock In,Clock Out,Status,Hours Worked,Method\n'
      data.forEach((r) => {
        csvContent += `"${r.id}","${r.date}","${r.clock_in || ''}","${r.clock_out || ''}","${r.status}","${r.hours_worked || 0}","${r.method}"\n`
      })
      return new Response(csvContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance_report_${startDate || 'export'}.csv"`,
        },
      })
    }

    return new Response(JSON.stringify({ records: data }), {
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

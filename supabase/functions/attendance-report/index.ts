import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', accept: '*/*' },
      })
    }

    const url = new URL(req.url)
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const format = url.searchParams.get('format') || 'json'

    // Validate date strings before passing to query filters to prevent
    // undefined/null values from being serialised as the string "undefined" in the URL
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
    if (startDate !== null && !ISO_DATE.test(startDate)) {
      return new Response(
        JSON.stringify({ error: 'Invalid startDate format. Expected YYYY-MM-DD' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', accept: '*/*' },
        }
      )
    }
    if (endDate !== null && !ISO_DATE.test(endDate)) {
      return new Response(
        JSON.stringify({ error: 'Invalid endDate format. Expected YYYY-MM-DD' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', accept: '*/*' },
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
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
          accept: '*/*',
        },
      })
    }

    return new Response(JSON.stringify({ records: data }), {
      status: 200,
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

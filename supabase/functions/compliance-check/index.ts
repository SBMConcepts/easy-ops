import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { targetDate } = await req.json()
    const checkDate = targetDate || new Date().toISOString().split('T')[0]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Gather records matching specific validation checkpoints
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('id, user_id, hours_worked, tenant_id')
      .eq('date', checkDate)

    if (error) throw error

    const infractions = []
    for (const record of records) {
      if (record.hours_worked > 12.0) {
        infractions.push({
          recordId: record.id,
          userId: record.user_id,
          tenantId: record.tenant_id,
          rule: 'MAX_DAILY_HOURS_EXCEEDED',
          details: `Shift recorded at ${record.hours_worked} total hours.`,
        })
      }
    }

    // Log tracking exceptions safely inside an audit log or dashboard alert table
    if (infractions.length > 0) {
      await supabase.from('compliance_logs').insert(infractions)
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: records.length,
        infractionsFound: infractions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

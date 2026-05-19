import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { resolveAuthContext } from '../_shared/auth-middleware.ts'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const ctx = await resolveAuthContext(req).catch((r) => r)
    if (ctx instanceof Response) return ctx
    const { userId: user_id_alias, organisationId, adminClient: supabaseAdmin } = ctx
    const user = { id: user_id_alias }
    const profile = { organisation_id: organisationId }

    // ── Find today's open check-in record ────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const { data: record, error: fetchError } = await supabaseAdmin
      .from('attendance_records')
      .select('id, clock_in, site_id, status')
      .eq('employee_id', user.id)
      .eq('date', today)
      .is('clock_out', null)
      .maybeSingle()

    if (fetchError) {
      console.error('check-out fetch error:', fetchError)
      return jsonResponse(
        {
          error: 'Failed to fetch attendance record',
          details: fetchError.message,
        },
        500
      )
    }

    if (!record) {
      return jsonResponse({ error: 'No open check-in found for today.' }, 404)
    }

    const now = new Date()
    const clockIn = new Date(record.clock_in)

    // Guard against future clock_in (clock skew / data corruption)
    if (clockIn >= now) {
      return jsonResponse(
        {
          error: 'Clock-in time is in the future. Contact your administrator.',
        },
        409
      )
    }

    const hoursWorked = Math.round(((now.getTime() - clockIn.getTime()) / 3_600_000) * 100) / 100

    // ── Determine standard hours from actual shift (default 8) ───────────
    let standardHours = 8

    if (record.site_id) {
      const { data: shifts } = await supabaseAdmin
        .from('shifts')
        .select('start_time, end_time')
        .eq('site_id', record.site_id)
        .eq('organisation_id', profile.organisation_id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (shifts?.length) {
        const [sh, sm] = shifts[0].start_time.split(':').map(Number)
        const [eh, em] = shifts[0].end_time.split(':').map(Number)
        standardHours = (eh * 60 + em - (sh * 60 + sm)) / 60
      }
    }

    const overtime = Math.max(0, Math.round((hoursWorked - standardHours) * 100) / 100)

    // ── Update record ────────────────────────────────────────────────────
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('attendance_records')
      .update({
        clock_out: now.toISOString(),
        hours_worked: hoursWorked,
        overtime,
      })
      .eq('id', record.id)
      .select('id, date, clock_in, clock_out, hours_worked, overtime, status')
      .single()

    if (updateError) {
      console.error('check-out update error:', updateError)
      return jsonResponse(
        {
          error: 'Failed to record check-out',
          details: updateError.message,
        },
        500
      )
    }

    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'check_out',
      target_table: 'attendance_records',
      target_id: record.id,
      details: { hours_worked: hoursWorked, overtime },
    })

    return jsonResponse({ success: true, record: updated })
  } catch (err) {
    console.error('check-out unhandled error:', err)
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500)
  }
})

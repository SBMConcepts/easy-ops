<<<<<<< Updated upstream
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
=======
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { resolveAuthContext } from '../_shared/auth-middleware.ts'
>>>>>>> Stashed changes

const VALID_METHODS = ['qr', 'biometric', 'whatsapp', 'manual']

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const ctx = await resolveAuthContext(req).catch((r) => r)
    if (ctx instanceof Response) return ctx
    const { userId: user_id_alias, organisationId, adminClient: supabaseAdmin } = ctx
    // alias for the rest of the function body which uses `user.id`
    const user = { id: user_id_alias }
    const profile = { organisation_id: organisationId }

    // ── Parse + validate body ────────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { method, site_id, latitude, longitude, notes } = body as any

    if (!method || !VALID_METHODS.includes(method)) {
      return jsonResponse(
        {
          error: `Invalid check-in method. Must be one of: ${VALID_METHODS.join(', ')}`,
        },
        400
      )
    }

    if (site_id != null) {
      if (typeof site_id !== 'string' || !isValidUUID(site_id)) {
        return jsonResponse({ error: 'site_id must be a valid UUID' }, 400)
      }
      // Verify site belongs to the employee's organisation
      const { data: siteRow } = await supabaseAdmin
        .from('sites')
        .select('id')
        .eq('id', site_id)
        .eq('organisation_id', profile.organisation_id)
        .single()

      if (!siteRow) {
        return jsonResponse(
          {
            error: 'site_id not found or does not belong to your organisation',
          },
          404
        )
      }
    }

    if (latitude != null) {
      const lat = Number(latitude)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return jsonResponse({ error: 'latitude must be a number between -90 and 90' }, 400)
      }
    }

    if (longitude != null) {
      const lng = Number(longitude)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return jsonResponse(
          {
            error: 'longitude must be a number between -180 and 180',
          },
          400
        )
      }
    }

    if (notes != null && typeof notes === 'string' && notes.length > 500) {
      return jsonResponse({ error: 'notes must not exceed 500 characters' }, 400)
    }

    // ── Duplicate check ──────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('employee_id', user.id)
      .eq('date', today)
      .is('clock_out', null)
      .maybeSingle()

    if (existing) {
      return jsonResponse({ error: 'Already clocked in today. Please clock out first.' }, 409)
    }

    // ── Late detection via actual shift (fallback: 08:00 + 15 min) ──────
    const now = new Date()
    let isLate = false

    if (site_id) {
      const { data: shifts } = await supabaseAdmin
        .from('shifts')
        .select('start_time, grace_period_minutes')
        .eq('site_id', site_id)
        .eq('organisation_id', profile.organisation_id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (shifts?.length) {
        const [sh, sm] = shifts[0].start_time.split(':').map(Number)
        const grace = shifts[0].grace_period_minutes ?? 15
        const deadline = new Date(now)
        deadline.setHours(sh, sm + grace, 0, 0)
        isLate = now > deadline
      } else {
        isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15)
      }
    } else {
      isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15)
    }

    // ── Insert record ────────────────────────────────────────────────────
    const { data: record, error: insertError } = await supabaseAdmin
      .from('attendance_records')
      .insert({
        employee_id: user.id,
        date: today,
        clock_in: now.toISOString(),
        method,
        status: isLate ? 'late' : 'present',
        site_id: site_id ?? null,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
        notes: notes ?? null,
      })
      .select('id, date, clock_in, method, status, site_id')
      .single()

    if (insertError) {
      console.error('check-in insert error:', insertError)
      return jsonResponse(
        {
          error: 'Failed to record check-in',
          details: insertError.message,
        },
        500
      )
    }

    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'check_in',
      target_table: 'attendance_records',
      target_id: record.id,
      details: {
        method,
        site_id: site_id ?? null,
        status: record.status,
      },
    })

    return jsonResponse({ success: true, record })
  } catch (err) {
    console.error('check-in unhandled error:', err)
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500)
  }
})

// Premium Support — ticket creation edge function.
//
// Single responsibility: open a support ticket and STAMP its plan-based SLA
// deadlines. Every other support operation (list, thread detail, replies,
// resolve/close, CSM contact) is handled directly by the Express router
// (server/routes/support.ts) with a service-role client.
//
// Auth: the browser holds no Auth0 token in this app, so the primary caller is
// the Express proxy presenting a shared secret (SUPPORT_FN_SECRET) plus a
// trusted org_id. A direct Auth0 Bearer call is supported as a fallback.
//
// SLA tiers (first-response / resolution, in hours) mirror
// src/lib/feature-flags.ts SUPPORT_SLA_TIERS:
//   enterprise 2/24 · pro (Business) 4/48 · growth 8/72 · starter 24/120 ·
//   free 48/168 (default for unknown plans).

import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth0 } from '../_shared/auth0.ts'

interface SlaTier {
  responseHours: number
  resolutionHours: number
}

const SLA_TIERS: Record<string, SlaTier> = {
  enterprise: { responseHours: 2, resolutionHours: 24 },
  pro: { responseHours: 4, resolutionHours: 48 },
  growth: { responseHours: 8, resolutionHours: 72 },
  starter: { responseHours: 24, resolutionHours: 120 },
  free: { responseHours: 48, resolutionHours: 168 },
}
const DEFAULT_TIER: SlaTier = SLA_TIERS.free

type Category = 'technical' | 'billing' | 'feature_request' | 'account' | 'general'
const CATEGORIES: Category[] = ['technical', 'billing', 'feature_request', 'account', 'general']

type Priority = 'low' | 'medium' | 'high' | 'urgent'
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

function slaTierForPlan(plan: string | null | undefined): SlaTier {
  const key = (plan ?? '').trim().toLowerCase()
  return SLA_TIERS[key] ?? DEFAULT_TIER
}

function addHours(from: Date, hours: number): string {
  return new Date(from.getTime() + hours * 3600_000).toISOString()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Authenticate — shared secret (Express proxy) or Auth0 Bearer fallback.
  const body = (await req.json().catch(() => ({}))) as {
    org_id?: string
    subject?: string
    description?: string
    category?: string
    priority?: string
    created_by?: string
  }

  const sharedSecret = Deno.env.get('SUPPORT_FN_SECRET')
  const presentedSecret = req.headers.get('x-support-secret')
  const trustedBySecret = !!sharedSecret && presentedSecret === sharedSecret

  let orgId: string | undefined
  let createdBy: string | undefined
  if (trustedBySecret) {
    orgId = typeof body.org_id === 'string' && body.org_id ? body.org_id : undefined
    createdBy = typeof body.created_by === 'string' ? body.created_by : undefined
  } else {
    let claims: Awaited<ReturnType<typeof verifyAuth0>>
    try {
      claims = await verifyAuth0(req)
    } catch (_err) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    orgId = claims.org_id ?? claims.auth0_org_id
    createdBy = claims.sub
  }

  if (!orgId) {
    return new Response(JSON.stringify({ error: 'Missing organization context.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  if (!subject) {
    return new Response(JSON.stringify({ error: 'A ticket subject is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const description = typeof body.description === 'string' ? body.description.trim() : null
  const category: Category = CATEGORIES.includes(body.category as Category)
    ? (body.category as Category)
    : 'general'
  const priority: Priority = PRIORITIES.includes(body.priority as Priority)
    ? (body.priority as Priority)
    : 'medium'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // 2. Resolve the org plan and derive the SLA tier.
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('plan')
    .eq('auth0_org_id', orgId)
    .maybeSingle()
  if (orgErr) {
    return new Response(JSON.stringify({ error: orgErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!org) {
    return new Response(JSON.stringify({ error: 'Organization not found.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const plan = org.plan ? String(org.plan) : null
  const tier = slaTierForPlan(plan)
  const now = new Date()

  // 3. Stamp the SLA deadlines and insert the ticket.
  const { data: ticket, error: insertErr } = await supabase
    .from('support_tickets')
    .insert({
      auth0_org_id: orgId,
      subject,
      description,
      category,
      priority,
      status: 'open',
      plan_at_creation: plan,
      sla_response_due: addHours(now, tier.responseHours),
      sla_resolution_due: addHours(now, tier.resolutionHours),
      created_by: createdBy ?? null,
    })
    .select('*')
    .single()

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      ticket,
      sla: { response_hours: tier.responseHours, resolution_hours: tier.resolutionHours },
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

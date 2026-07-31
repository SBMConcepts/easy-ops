import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requireRole,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Database } from '../types/supabase.js'

type TicketUpdate = Database['public']['Tables']['support_tickets']['Update']

const router = Router()

// Premium Support API.
//
// Ticket CREATION is delegated to the Supabase Edge Function
// (supabase/functions/support-ticket) which stamps the plan-based SLA deadlines
// with a service-role client. This Express router is the cookie-authenticated
// entry point: it enforces permissions, proxies creation to the function with a
// shared secret (the browser holds no Auth0 token in this app), and handles the
// remaining operations — listing, thread detail, replies, admin resolve/close,
// and the CSM contact — directly against the service-role client.

// Roles that act as support agents (see internal notes, author replies as staff).
const STAFF_ROLES = new Set(['owner', 'admin', 'manager'])

const TICKET_STATUSES = ['open', 'pending', 'in_progress', 'resolved', 'closed'] as const
type TicketStatus = (typeof TICKET_STATUSES)[number]
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
type TicketPriority = (typeof TICKET_PRIORITIES)[number]

function isStaff(req: AuthedRequest): boolean {
  return STAFF_ROLES.has(String(req.auth?.role ?? ''))
}

// ── POST /api/support/tickets — open a ticket (SLA stamped by the edge fn) ───
router.post(
  '/api/support/tickets',
  requireAuth,
  requireOrg,
  requirePermission('write:support_tickets'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      subject?: unknown
      description?: unknown
      category?: unknown
      priority?: unknown
    }

    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    if (!subject) {
      res.status(400).json({ error: 'A ticket subject is required.' })
      return
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const fnSecret = process.env.SUPPORT_FN_SECRET
    if (!supabaseUrl || !fnSecret) {
      res.status(500).json({
        error: 'Support function is not configured (SUPABASE_URL / SUPPORT_FN_SECRET).',
      })
      return
    }

    try {
      const fnRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/support-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-support-secret': fnSecret },
        body: JSON.stringify({
          org_id: orgId,
          created_by: req.auth?.sub,
          subject,
          description: typeof body.description === 'string' ? body.description : null,
          category: typeof body.category === 'string' ? body.category : 'general',
          priority: typeof body.priority === 'string' ? body.priority : 'medium',
        }),
      })
      const payload = (await fnRes.json().catch(() => ({}))) as Record<string, unknown>
      if (!fnRes.ok) {
        res
          .status(fnRes.status)
          .json({ error: (payload.error as string) ?? 'Ticket creation failed.' })
        return
      }
      res.status(201).json(payload)
    } catch (err) {
      res.status(502).json({ error: `Support function unreachable: ${(err as Error).message}` })
    }
  }
)

// ── GET /api/support/tickets[?status=&limit=] — list tickets, newest first ───
router.get(
  '/api/support/tickets',
  requireAuth,
  requireOrg,
  requirePermission('read:support_tickets'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const limit = Math.min(Number(req.query.limit) || 100, 200)
    const status = String(req.query.status ?? '')

    let query = supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('auth0_org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if ((TICKET_STATUSES as readonly string[]).includes(status)) {
      query = query.eq('status', status as TicketStatus)
    }

    const { data: tickets, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    // Attach reporter display names (best-effort) from the users directory.
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('auth0_user_id, full_name')
      .eq('auth0_org_id', orgId)
    const names: Record<string, string> = {}
    for (const u of users ?? []) names[u.auth0_user_id] = u.full_name ?? ''

    const enriched = (tickets ?? []).map((t) => ({
      ...t,
      reporter_name: t.created_by ? (names[t.created_by] ?? null) : null,
      assignee_name: t.assigned_to ? (names[t.assigned_to] ?? null) : null,
    }))

    res.json({ tickets: enriched })
  }
)

// ── GET /api/support/tickets/:id — ticket + threaded messages ────────────────
router.get(
  '/api/support/tickets/:id',
  requireAuth,
  requireOrg,
  requirePermission('read:support_tickets'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const ticketId = String(req.params.id)

    const { data: ticket, error: tErr } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('auth0_org_id', orgId)
      .eq('id', ticketId)
      .maybeSingle()
    if (tErr) {
      res.status(500).json({ error: tErr.message })
      return
    }
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' })
      return
    }

    let msgQuery = supabaseAdmin
      .from('support_messages')
      .select('*')
      .eq('auth0_org_id', orgId)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    // Internal notes are visible to staff only.
    if (!isStaff(req)) msgQuery = msgQuery.eq('is_internal', false)

    const { data: messages, error: mErr } = await msgQuery
    if (mErr) {
      res.status(500).json({ error: mErr.message })
      return
    }

    res.json({ ticket, messages: messages ?? [] })
  }
)

// ── POST /api/support/tickets/:id/messages — post a reply ────────────────────
router.post(
  '/api/support/tickets/:id/messages',
  requireAuth,
  requireOrg,
  requirePermission('write:support_messages'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const ticketId = String(req.params.id)
    const body = (req.body ?? {}) as { body?: unknown; is_internal?: unknown }

    const text = typeof body.body === 'string' ? body.body.trim() : ''
    if (!text) {
      res.status(400).json({ error: 'A reply body is required.' })
      return
    }

    const { data: ticket, error: tErr } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status, first_response_at')
      .eq('auth0_org_id', orgId)
      .eq('id', ticketId)
      .maybeSingle()
    if (tErr) {
      res.status(500).json({ error: tErr.message })
      return
    }
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' })
      return
    }

    const staff = isStaff(req)
    const authorRole = staff ? 'agent' : 'customer'
    const isInternal = staff && body.is_internal === true

    const { data: message, error: insErr } = await supabaseAdmin
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        auth0_org_id: orgId,
        author_id: req.auth?.sub ?? null,
        author_role: authorRole,
        body: text,
        is_internal: isInternal,
      })
      .select('*')
      .single()
    if (insErr) {
      res.status(500).json({ error: insErr.message })
      return
    }

    // Stamp first response + advance the ticket lifecycle for a public staff reply.
    const nowIso = new Date().toISOString()
    const ticketUpdate: TicketUpdate = { updated_at: nowIso }
    if (staff && !isInternal && !ticket.first_response_at) {
      ticketUpdate.first_response_at = nowIso
    }
    if (staff && !isInternal && ticket.status === 'open') {
      ticketUpdate.status = 'in_progress'
    }
    await supabaseAdmin.from('support_tickets').update(ticketUpdate).eq('id', ticketId)

    res.status(201).json({ message })
  }
)

// ── PATCH /api/support/tickets/:id — status / priority / assignment (admin) ──
router.patch(
  '/api/support/tickets/:id',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  requirePermission('write:support_tickets'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const ticketId = String(req.params.id)
    const body = (req.body ?? {}) as {
      status?: unknown
      priority?: unknown
      assigned_to?: unknown
    }

    const update: TicketUpdate = { updated_at: new Date().toISOString() }
    const nowIso = update.updated_at as string

    if (body.status !== undefined) {
      if (!(TICKET_STATUSES as readonly string[]).includes(String(body.status))) {
        res.status(400).json({ error: 'Invalid ticket status.' })
        return
      }
      const status = body.status as TicketStatus
      update.status = status
      if (status === 'resolved') {
        update.resolved_at = nowIso
        update.closed_at = null
      } else if (status === 'closed') {
        update.closed_at = nowIso
      } else {
        // Reopening clears resolution/closure timestamps.
        update.resolved_at = null
        update.closed_at = null
      }
    }

    if (body.priority !== undefined) {
      if (!(TICKET_PRIORITIES as readonly string[]).includes(String(body.priority))) {
        res.status(400).json({ error: 'Invalid ticket priority.' })
        return
      }
      update.priority = body.priority as TicketPriority
    }

    if (body.assigned_to !== undefined) {
      update.assigned_to =
        typeof body.assigned_to === 'string' && body.assigned_to ? body.assigned_to : null
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .update(update)
      .eq('auth0_org_id', orgId)
      .eq('id', ticketId)
      .select('*')
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' })
      return
    }
    res.json({ ticket })
  }
)

// ── GET /api/support/csm — Customer Success Manager contact ──────────────────
router.get(
  '/api/support/csm',
  requireAuth,
  requireOrg,
  requirePermission('read:csm_assignments'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const { data, error } = await supabaseAdmin
      .from('csm_assignments')
      .select('*')
      .eq('auth0_org_id', orgId)
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ csm: data ?? null })
  }
)

// ── PUT /api/support/csm — set/update the CSM contact (admin) ─────────────────
router.put(
  '/api/support/csm',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  requirePermission('write:csm_assignments'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      csm_name?: unknown
      csm_email?: unknown
      csm_phone?: unknown
      csm_title?: unknown
      calendar_url?: unknown
      notes?: unknown
    }

    const csmName = typeof body.csm_name === 'string' ? body.csm_name.trim() : ''
    const csmEmail = typeof body.csm_email === 'string' ? body.csm_email.trim() : ''
    if (!csmName || !csmEmail) {
      res.status(400).json({ error: 'csm_name and csm_email are required.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('csm_assignments')
      .upsert(
        {
          auth0_org_id: orgId,
          csm_name: csmName,
          csm_email: csmEmail,
          csm_phone: typeof body.csm_phone === 'string' ? body.csm_phone : null,
          csm_title: typeof body.csm_title === 'string' ? body.csm_title : null,
          calendar_url: typeof body.calendar_url === 'string' ? body.calendar_url : null,
          notes: typeof body.notes === 'string' ? body.notes : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'auth0_org_id' }
      )
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ csm: data })
  }
)

export default router

import { Router, type Response, type NextFunction } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import type { Database } from '../types/supabase.js'

type TemplateInsert = Database['public']['Tables']['safety_checklist_templates']['Insert']
type TemplateUpdate = Database['public']['Tables']['safety_checklist_templates']['Update']
type IncidentUpdate = Database['public']['Tables']['incident_reports']['Update']

const router = Router()

// Safety Ops API.
//
// Reusable shift-start checklist templates (managed by admins/managers), staff
// sign-and-submit checklist responses with pass/flag tracking, and incident
// reports with a reporter e-signature plus manager counter-signature and status
// updates. Everything is tenant-scoped and the whole feature is gated behind the
// Business tier (mapped to the pro + enterprise plans). This Express router is
// the cookie-authenticated entry point and runs against the service-role client
// (bypassing RLS); the Postgres RLS policies enforce the same scopes for any
// direct authenticated-client access.

// Business tier — mirrors the frontend flag (src/lib/feature-flags.ts).
const SAFETY_PLANS = new Set(['pro', 'enterprise'])

// Roles that act as safety supervisors (see every response/incident, review).
const STAFF_ROLES = new Set(['owner', 'admin', 'manager'])

const INCIDENT_TYPES = [
  'injury',
  'near_miss',
  'property_damage',
  'environmental',
  'security',
  'vehicle',
  'other',
] as const
type IncidentType = (typeof INCIDENT_TYPES)[number]

const INCIDENT_SEVERITIES = ['minor', 'moderate', 'serious', 'fatal'] as const
type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

const INCIDENT_STATUSES = ['open', 'under_review', 'closed'] as const
type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

function isStaff(req: AuthedRequest): boolean {
  return STAFF_ROLES.has(String(req.auth?.role ?? ''))
}

/** Gate the whole feature behind the Business (pro/enterprise) plan. */
async function requireSafetyPlan(req: AuthedRequest, res: Response, next: NextFunction) {
  const orgId = req.orgId!
  const { data: org, error } = await supabaseAdmin
    .from('organizations')
    .select('plan')
    .eq('auth0_org_id', orgId)
    .maybeSingle()
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!org || !SAFETY_PLANS.has(String(org.plan))) {
    res.status(403).json({ error: 'Safety Ops requires a Business (Pro) or Enterprise plan.' })
    return
  }
  next()
}

// ── Checklist templates ──────────────────────────────────────────────────────

// GET /api/safety/templates[?active=1] — list checklist templates.
router.get(
  '/api/safety/templates',
  requireAuth,
  requireOrg,
  requirePermission('read:safety_templates'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    let query = supabaseAdmin
      .from('safety_checklist_templates')
      .select('*')
      .eq('auth0_org_id', orgId)
      .order('created_at', { ascending: false })

    if (String(req.query.active) === '1') query = query.eq('active', true)

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ templates: data ?? [] })
  }
)

// POST /api/safety/templates — create a checklist template (admin/manager).
router.post(
  '/api/safety/templates',
  requireAuth,
  requireOrg,
  requirePermission('write:safety_templates'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      name?: unknown
      description?: unknown
      items?: unknown
      required_at_shift_start?: unknown
      active?: unknown
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      res.status(400).json({ error: 'A template name is required.' })
      return
    }

    const insert: TemplateInsert = {
      auth0_org_id: orgId,
      name,
      description: typeof body.description === 'string' ? body.description : null,
      items: Array.isArray(body.items) ? (body.items as TemplateInsert['items']) : [],
      required_at_shift_start: body.required_at_shift_start !== false,
      active: body.active !== false,
      created_by: req.auth?.sub ?? null,
    }

    const { data, error } = await supabaseAdmin
      .from('safety_checklist_templates')
      .insert(insert)
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json({ template: data })
  }
)

// PATCH /api/safety/templates/:id — update a template (admin/manager).
router.patch(
  '/api/safety/templates/:id',
  requireAuth,
  requireOrg,
  requirePermission('write:safety_templates'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const id = String(req.params.id)
    const body = (req.body ?? {}) as {
      name?: unknown
      description?: unknown
      items?: unknown
      required_at_shift_start?: unknown
      active?: unknown
    }

    const update: TemplateUpdate = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) {
        res.status(400).json({ error: 'Template name cannot be empty.' })
        return
      }
      update.name = name
    }
    if (body.description !== undefined) {
      update.description = typeof body.description === 'string' ? body.description : null
    }
    if (Array.isArray(body.items)) update.items = body.items as TemplateUpdate['items']
    if (body.required_at_shift_start !== undefined) {
      update.required_at_shift_start = body.required_at_shift_start === true
    }
    if (body.active !== undefined) update.active = body.active === true

    const { data, error } = await supabaseAdmin
      .from('safety_checklist_templates')
      .update(update)
      .eq('auth0_org_id', orgId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Template not found.' })
      return
    }
    res.json({ template: data })
  }
)

// DELETE /api/safety/templates/:id — delete a template (admin).
router.delete(
  '/api/safety/templates/:id',
  requireAuth,
  requireOrg,
  requirePermission('delete:safety_templates'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const id = String(req.params.id)
    const { error } = await supabaseAdmin
      .from('safety_checklist_templates')
      .delete()
      .eq('auth0_org_id', orgId)
      .eq('id', id)
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(204).end()
  }
)

// ── Checklist responses ──────────────────────────────────────────────────────

// GET /api/safety/responses[?template_id=] — members see their own; staff see all.
router.get(
  '/api/safety/responses',
  requireAuth,
  requireOrg,
  requirePermission('read:safety_checklists'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const limit = Math.min(Number(req.query.limit) || 100, 200)

    let query = supabaseAdmin
      .from('safety_checklist_responses')
      .select('*')
      .eq('auth0_org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    const templateId = String(req.query.template_id ?? '')
    if (templateId) query = query.eq('template_id', templateId)
    // Members are scoped to their own submissions.
    if (!isStaff(req)) query = query.eq('auth0_user_id', req.auth?.sub ?? '')

    const { data: responses, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    // Attach submitter display names (best-effort) from the membership roster.
    const { data: users } = await supabaseAdmin
      .from('org_members')
      .select('auth0_user_id, full_name')
      .eq('auth0_org_id', orgId)
    const names: Record<string, string> = {}
    for (const u of users ?? []) names[u.auth0_user_id] = u.full_name ?? ''

    const enriched = (responses ?? []).map((r) => ({
      ...r,
      user_name: r.auth0_user_id ? (names[r.auth0_user_id] ?? null) : null,
    }))
    res.json({ responses: enriched })
  }
)

// POST /api/safety/responses — sign & submit a checklist (any active member).
router.post(
  '/api/safety/responses',
  requireAuth,
  requireOrg,
  requirePermission('write:safety_checklists'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      template_id?: unknown
      responses?: unknown
      passed?: unknown
      notes?: unknown
      signature_data?: unknown
      shift_id?: unknown
      site_id?: unknown
    }

    const templateId = typeof body.template_id === 'string' ? body.template_id : ''
    const signature = typeof body.signature_data === 'string' ? body.signature_data.trim() : ''
    if (!templateId) {
      res.status(400).json({ error: 'template_id is required.' })
      return
    }
    if (!signature) {
      res.status(400).json({ error: 'A signature is required to submit a checklist.' })
      return
    }

    // Confirm the template belongs to the caller's org.
    const { data: template, error: tErr } = await supabaseAdmin
      .from('safety_checklist_templates')
      .select('id')
      .eq('auth0_org_id', orgId)
      .eq('id', templateId)
      .maybeSingle()
    if (tErr) {
      res.status(500).json({ error: tErr.message })
      return
    }
    if (!template) {
      res.status(404).json({ error: 'Checklist template not found.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('safety_checklist_responses')
      .insert({
        auth0_org_id: orgId,
        template_id: templateId,
        auth0_user_id: req.auth?.sub ?? '',
        responses: Array.isArray(body.responses) ? body.responses : [],
        passed: body.passed !== false,
        notes: typeof body.notes === 'string' ? body.notes : null,
        signature_data: signature,
        shift_id: typeof body.shift_id === 'string' && body.shift_id ? body.shift_id : null,
        site_id: typeof body.site_id === 'string' && body.site_id ? body.site_id : null,
      })
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json({ response: data })
  }
)

// ── Incident reports ─────────────────────────────────────────────────────────

// GET /api/safety/incidents[?status=] — members see their own; staff see all.
router.get(
  '/api/safety/incidents',
  requireAuth,
  requireOrg,
  requirePermission('read:incident_reports'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const limit = Math.min(Number(req.query.limit) || 100, 200)

    let query = supabaseAdmin
      .from('incident_reports')
      .select('*')
      .eq('auth0_org_id', orgId)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    const status = String(req.query.status ?? '')
    if ((INCIDENT_STATUSES as readonly string[]).includes(status)) {
      query = query.eq('status', status as IncidentStatus)
    }
    if (!isStaff(req)) query = query.eq('reporter_id', req.auth?.sub ?? '')

    const { data: incidents, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    const { data: users } = await supabaseAdmin
      .from('org_members')
      .select('auth0_user_id, full_name')
      .eq('auth0_org_id', orgId)
    const names: Record<string, string> = {}
    for (const u of users ?? []) names[u.auth0_user_id] = u.full_name ?? ''

    const enriched = (incidents ?? []).map((i) => ({
      ...i,
      reporter_name: i.reporter_id ? (names[i.reporter_id] ?? null) : null,
      manager_name: i.manager_user_id ? (names[i.manager_user_id] ?? null) : null,
    }))
    res.json({ incidents: enriched })
  }
)

// GET /api/safety/incidents/:id — a single incident (staff, or the reporter).
router.get(
  '/api/safety/incidents/:id',
  requireAuth,
  requireOrg,
  requirePermission('read:incident_reports'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const id = String(req.params.id)
    const { data: incident, error } = await supabaseAdmin
      .from('incident_reports')
      .select('*')
      .eq('auth0_org_id', orgId)
      .eq('id', id)
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!incident) {
      res.status(404).json({ error: 'Incident not found.' })
      return
    }
    if (!isStaff(req) && incident.reporter_id !== req.auth?.sub) {
      res.status(403).json({ error: 'You can only view your own incident reports.' })
      return
    }
    res.json({ incident })
  }
)

// POST /api/safety/incidents — file an incident with a reporter e-signature.
router.post(
  '/api/safety/incidents',
  requireAuth,
  requireOrg,
  requirePermission('write:incident_reports'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      incident_type?: unknown
      severity?: unknown
      occurred_at?: unknown
      description?: unknown
      actions_taken?: unknown
      witnesses?: unknown
      photos?: unknown
      reporter_signature?: unknown
      site_id?: unknown
      department_id?: unknown
    }

    const incidentType = String(body.incident_type ?? '')
    const severity = String(body.severity ?? '')
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const signature =
      typeof body.reporter_signature === 'string' ? body.reporter_signature.trim() : ''

    if (!(INCIDENT_TYPES as readonly string[]).includes(incidentType)) {
      res.status(400).json({ error: 'A valid incident_type is required.' })
      return
    }
    if (!(INCIDENT_SEVERITIES as readonly string[]).includes(severity)) {
      res.status(400).json({ error: 'A valid severity is required.' })
      return
    }
    if (!description) {
      res.status(400).json({ error: 'An incident description is required.' })
      return
    }
    if (!signature) {
      res.status(400).json({ error: 'A reporter signature is required.' })
      return
    }

    const occurredAt =
      typeof body.occurred_at === 'string' && body.occurred_at
        ? new Date(body.occurred_at).toISOString()
        : new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('incident_reports')
      .insert({
        auth0_org_id: orgId,
        reporter_id: req.auth?.sub ?? '',
        incident_type: incidentType as IncidentType,
        severity: severity as IncidentSeverity,
        occurred_at: occurredAt,
        description,
        actions_taken: typeof body.actions_taken === 'string' ? body.actions_taken : null,
        witnesses: typeof body.witnesses === 'string' ? body.witnesses : null,
        photos: Array.isArray(body.photos) ? body.photos : [],
        reporter_signature: signature,
        site_id: typeof body.site_id === 'string' && body.site_id ? body.site_id : null,
        department_id:
          typeof body.department_id === 'string' && body.department_id ? body.department_id : null,
        status: 'open',
      })
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(201).json({ incident: data })
  }
)

// PATCH /api/safety/incidents/:id — manager review: counter-sign + status.
router.patch(
  '/api/safety/incidents/:id',
  requireAuth,
  requireOrg,
  requirePermission('write:incident_reports'),
  requireSafetyPlan,
  async (req: AuthedRequest, res: Response) => {
    // Only supervisors (owner/admin/manager) may review incidents.
    if (!isStaff(req)) {
      res.status(403).json({ error: 'Only managers can review incident reports.' })
      return
    }

    const orgId = req.orgId!
    const id = String(req.params.id)
    const body = (req.body ?? {}) as {
      status?: unknown
      manager_notes?: unknown
      manager_signature?: unknown
      severity?: unknown
    }

    const update: IncidentUpdate = { updated_at: new Date().toISOString() }

    if (body.status !== undefined) {
      if (!(INCIDENT_STATUSES as readonly string[]).includes(String(body.status))) {
        res.status(400).json({ error: 'Invalid incident status.' })
        return
      }
      update.status = body.status as IncidentStatus
    }
    if (body.severity !== undefined) {
      if (!(INCIDENT_SEVERITIES as readonly string[]).includes(String(body.severity))) {
        res.status(400).json({ error: 'Invalid severity.' })
        return
      }
      update.severity = body.severity as IncidentSeverity
    }
    if (body.manager_notes !== undefined) {
      update.manager_notes = typeof body.manager_notes === 'string' ? body.manager_notes : null
    }
    // A manager counter-signature stamps the reviewer + timestamp.
    if (typeof body.manager_signature === 'string' && body.manager_signature.trim()) {
      update.manager_signature = body.manager_signature.trim()
      update.manager_user_id = req.auth?.sub ?? null
      update.manager_signed_at = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('incident_reports')
      .update(update)
      .eq('auth0_org_id', orgId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Incident not found.' })
      return
    }
    res.json({ incident: data })
  }
)

export default router

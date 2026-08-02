import { Router, type NextFunction, type Response } from 'express'
import multer from 'multer'

import { requireAuth, requireOrg, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { permissionsForRole } from '../lib/permissions.js'
import type { TablesUpdate } from '../types/supabase.js'

const router = Router()

const AVATAR_BUCKET = 'avatars'
const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const AVATAR_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
}).single('avatar')

// Sanitize the Auth0 subject into a safe storage path segment. Auth0 subjects
// (e.g. "auth0|abc") contain characters Supabase storage keys reject, so the
// same transform is mirrored in the storage RLS policies (see the
// avatars_policies migration) using regexp_replace.
function safeSubject(sub: string): string {
  return sub.replace(/[^a-zA-Z0-9_-]/g, '_')
}

// Object layout: {auth0_org_id}/{sanitized_sub}/avatar.{ext} — the org is the
// first folder segment and the user the second, matching the storage policies.
function avatarFolder(orgId: string, sub: string): string {
  return `${orgId}/${safeSubject(sub)}`
}

router.get('/api/userinfo', requireAuth, requireOrg, async (req: AuthedRequest, res: Response) => {
  const sub = req.auth!.sub
  const orgId = req.orgId!

  // Identity + PII live on user_credentials (the tenant identity anchor). The
  // organization-scoped membership (role, status, avatar) lives on org_members.
  const { data: cred, error: credErr } = await supabaseAdmin
    .from('user_credentials')
    .select(
      'id, auth0_org_id, auth0_user_id, email, full_name, first_name, last_name, mobile_number, national_id, id_type, address, emergency_contact_name, emergency_contact_phone, status'
    )
    .eq('auth0_user_id', sub)
    .eq('auth0_org_id', orgId)
    .maybeSingle()

  if (credErr) {
    res.status(500).json({ error: credErr.message })
    return
  }
  if (!cred) {
    res.status(404).json({ error: 'User profile not found.' })
    return
  }

  const [{ data: member }, { data: org }, { data: subscription }, { data: leaveRows }] =
    await Promise.all([
      supabaseAdmin
        .from('org_members')
        .select(
          'role, status, joined_at, avatar_url, full_name, email, department_id, site_id, job_role_id, shift_id, manager_id, employee_code, employment_type, hourly_rate, tax_number'
        )
        .eq('auth0_org_id', orgId)
        .eq('auth0_user_id', sub)
        .maybeSingle(),
      supabaseAdmin
        .from('organizations')
        .select('auth0_org_id, name, slug, status, logo_url, country, industry')
        .eq('auth0_org_id', orgId)
        .maybeSingle(),
      supabaseAdmin
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('auth0_org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('org_leave_balances')
        .select('leave_type, balance_days')
        .eq('auth0_org_id', orgId)
        .eq('auth0_user_id', sub),
    ])

  // Resolve display labels for the caller's assignment references. Each is a
  // small per-org lookup table, so only fetch the ones actually assigned.
  const [deptRow, siteRow, jobRoleRow, shiftRow, managerRow] = await Promise.all([
    member?.department_id
      ? supabaseAdmin
          .from('org_departments')
          .select('department_name')
          .eq('id', member.department_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    member?.site_id
      ? supabaseAdmin.from('org_sites').select('site_name').eq('id', member.site_id).maybeSingle()
      : Promise.resolve({ data: null }),
    member?.job_role_id
      ? supabaseAdmin.from('org_roles').select('name').eq('id', member.job_role_id).maybeSingle()
      : Promise.resolve({ data: null }),
    member?.shift_id
      ? supabaseAdmin
          .from('org_shifts')
          .select('shift_name')
          .eq('id', member.shift_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    member?.manager_id
      ? supabaseAdmin
          .from('org_members')
          .select('full_name')
          .eq('auth0_org_id', orgId)
          .eq('auth0_user_id', member.manager_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  res.json({
    profile_id: cred.id,
    auth0_user_id: cred.auth0_user_id,
    auth0_org_id: cred.auth0_org_id,
    email: cred.email,
    full_name: cred.full_name ?? member?.full_name ?? '',
    avatar_url: member?.avatar_url ?? null,
    first_name: cred.first_name ?? '',
    last_name: cred.last_name ?? '',
    mobile_number: cred.mobile_number ?? null,
    national_id: cred.national_id ?? null,
    id_type: cred.id_type ?? null,
    address: cred.address ?? null,
    emergency_contact_name: cred.emergency_contact_name ?? null,
    emergency_contact_phone: cred.emergency_contact_phone ?? null,
    user_status: cred.status ?? 'active',
    org_id: org?.auth0_org_id ?? null,
    role: member?.role ?? 'member',
    permissions: permissionsForRole(member?.role ?? 'member'),
    status: member?.status ?? 'active',
    membership_status: member?.status ?? 'active',
    joined_at: member?.joined_at ?? null,
    department_id: member?.department_id ?? null,
    department_name: deptRow.data?.department_name ?? null,
    site_id: member?.site_id ?? null,
    site_name: siteRow.data?.site_name ?? null,
    job_role_id: member?.job_role_id ?? null,
    job_role_name: jobRoleRow.data?.name ?? null,
    shift_id: member?.shift_id ?? null,
    shift_name: shiftRow.data?.shift_name ?? null,
    manager_id: member?.manager_id ?? null,
    manager_name: managerRow.data?.full_name ?? null,
    employee_code: member?.employee_code ?? null,
    employment_type: member?.employment_type ?? null,
    hourly_rate: member?.hourly_rate ?? null,
    tax_number: member?.tax_number ?? null,
    org_name: org?.name ?? '',
    org_auth0_id: org?.auth0_org_id ?? '',
    org_status: org?.status ?? 'active',
    org_logo: org?.logo_url || null,
    org_country: org?.country ?? '',
    org_industry: org?.industry ?? '',
    plan: subscription?.plan ?? null,
    billing_status: subscription?.status ?? null,
    current_period_end: subscription?.current_period_end ?? null,
    leave_balances: (leaveRows ?? []).map((r) => ({
      leave_type: r.leave_type,
      balance_days: Number(r.balance_days),
    })),
  })
})

router.put('/api/userinfo', requireAuth, async (req: AuthedRequest, res: Response) => {
  const sub = req.auth!.sub
  const body = (req.body ?? {}) as {
    full_name?: unknown
    first_name?: unknown
    last_name?: unknown
    mobile_number?: unknown
    national_id?: unknown
    id_type?: unknown
    address?: unknown
    emergency_contact_name?: unknown
    emergency_contact_phone?: unknown
  }

  const update: TablesUpdate<'user_credentials'> = {
    last_synced_at: new Date().toISOString(),
  }
  if (typeof body.full_name === 'string') update.full_name = body.full_name
  if (typeof body.first_name === 'string') update.first_name = body.first_name
  if (typeof body.last_name === 'string') update.last_name = body.last_name

  // Nullable contact fields: empty string clears them.
  const nullableText = (v: unknown): string | null | undefined => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    return typeof v === 'string' ? v : undefined
  }
  const mobile = nullableText(body.mobile_number)
  if (mobile !== undefined) update.mobile_number = mobile
  const nationalId = nullableText(body.national_id)
  if (nationalId !== undefined) update.national_id = nationalId
  const address = nullableText(body.address)
  if (address !== undefined) update.address = address
  const ecName = nullableText(body.emergency_contact_name)
  if (ecName !== undefined) update.emergency_contact_name = ecName
  const ecPhone = nullableText(body.emergency_contact_phone)
  if (ecPhone !== undefined) update.emergency_contact_phone = ecPhone

  if ('id_type' in body) {
    if (body.id_type === null || body.id_type === '') {
      update.id_type = null
    } else if (body.id_type === 'sa_id' || body.id_type === 'passport') {
      update.id_type = body.id_type
    } else {
      res.status(400).json({ error: "id_type must be 'sa_id' or 'passport'." })
      return
    }
  }

  const { data, error } = await supabaseAdmin
    .from('user_credentials')
    .update(update)
    .eq('auth0_user_id', sub)
    .select('id, auth0_org_id, auth0_user_id, full_name, email')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'That mobile number is already in use.' })
      return
    }
    res.status(500).json({ error: error.message })
    return
  }

  // Keep the org roster (org_members) in sync with the display-name fields so
  // Team Members / attendance views reflect profile edits without a re-sync.
  const nameSync: TablesUpdate<'org_members'> = {}
  if (typeof body.full_name === 'string') nameSync.full_name = body.full_name
  if (typeof body.first_name === 'string') nameSync.first_name = body.first_name
  if (typeof body.last_name === 'string') nameSync.last_name = body.last_name
  if (Object.keys(nameSync).length > 0) {
    await supabaseAdmin.from('org_members').update(nameSync).eq('auth0_user_id', sub)
  }

  res.json({ ok: true, profile: data })
})

// Upload (or replace) the caller's profile avatar. Multipart field name: "avatar".
router.post(
  '/api/userinfo/avatar',
  requireAuth,
  requireOrg,
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    avatarUpload(req, res, (err: unknown) => {
      if (err) {
        const isSize =
          typeof err === 'object' &&
          err !== null &&
          (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
        res
          .status(isSize ? 413 : 400)
          .json({ error: isSize ? 'Image must be 2MB or smaller.' : 'Invalid file upload.' })
        return
      }
      next()
    })
  },
  async (req: AuthedRequest, res: Response) => {
    const sub = req.auth!.sub
    const orgId = req.orgId!
    const file = req.file

    if (!file) {
      res.status(400).json({ error: 'No image file provided.' })
      return
    }

    const ext = AVATAR_MIME_EXT[file.mimetype]
    if (!ext) {
      res.status(415).json({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' })
      return
    }

    const folder = avatarFolder(orgId, sub)
    const objectPath = `${folder}/avatar.${ext}`

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: true })

    if (uploadErr) {
      res.status(500).json({ error: uploadErr.message })
      return
    }

    // Remove stale variants left over from a previously uploaded format.
    const staleObjects = Object.values(AVATAR_MIME_EXT)
      .filter((e) => e !== ext)
      .map((e) => `${folder}/avatar.${e}`)
    if (staleObjects.length > 0) {
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove(staleObjects)
    }

    const { data: pub } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath)
    // Cache-bust so the browser fetches the new image after a replace.
    const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`

    const { data, error } = await supabaseAdmin
      .from('org_members')
      .update({ avatar_url: avatarUrl })
      .eq('auth0_user_id', sub)
      .eq('auth0_org_id', orgId)
      .select('id, auth0_org_id, auth0_user_id, full_name, avatar_url, email')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ ok: true, avatar_url: avatarUrl, profile: data })
  }
)

// Remove the caller's profile avatar.
router.delete(
  '/api/userinfo/avatar',
  requireAuth,
  requireOrg,
  async (req: AuthedRequest, res: Response) => {
    const sub = req.auth!.sub
    const orgId = req.orgId!
    const folder = avatarFolder(orgId, sub)

    const objects = Object.values(AVATAR_MIME_EXT).map((e) => `${folder}/avatar.${e}`)
    const { error: removeErr } = await supabaseAdmin.storage.from(AVATAR_BUCKET).remove(objects)
    if (removeErr) {
      res.status(500).json({ error: removeErr.message })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('org_members')
      .update({ avatar_url: null })
      .eq('auth0_user_id', sub)
      .eq('auth0_org_id', orgId)
      .select('id, auth0_org_id, auth0_user_id, full_name, avatar_url, email')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ ok: true, avatar_url: null, profile: data })
  }
)

export default router

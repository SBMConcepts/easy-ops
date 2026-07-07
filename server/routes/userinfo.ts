import { Router, type NextFunction, type Response } from 'express'
import multer from 'multer'

import { requireAuth, requireOrg, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { permissionsForRole } from '../lib/permissions.js'

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

  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, auth0_org_id, auth0_user_id, email, full_name, avatar_url')
    .eq('auth0_user_id', sub)
    .eq('auth0_org_id', orgId)
    .maybeSingle()

  if (userErr) {
    res.status(500).json({ error: userErr.message })
    return
  }
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' })
    return
  }

  const [{ data: member }, { data: org }, { data: subscription }] = await Promise.all([
    supabaseAdmin
      .from('org_members')
      .select('role, status, joined_at')
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
  ])

  res.json({
    profile_id: user.id,
    auth0_user_id: user.auth0_user_id,
    auth0_org_id: user.auth0_org_id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    user_status: 'active',
    org_id: org?.auth0_org_id ?? null,
    role: member?.role ?? 'member',
    permissions: permissionsForRole(member?.role ?? 'member'),
    membership_status: member?.status ?? 'active',
    joined_at: member?.joined_at ?? null,
    org_name: org?.name ?? '',
    org_auth0_id: org?.auth0_org_id ?? '',
    org_status: org?.status ?? 'active',
    org_logo: org?.logo_url || null,
    org_country: org?.country ?? '',
    org_industry: org?.industry ?? '',
    plan: subscription?.plan ?? null,
    billing_status: subscription?.status ?? null,
    current_period_end: subscription?.current_period_end ?? null,
  })
})

router.put('/api/userinfo', requireAuth, async (req: AuthedRequest, res: Response) => {
  const sub = req.auth!.sub
  const body = (req.body ?? {}) as { full_name?: unknown }

  const update: {
    auth0_org_id?: string
    auth0_user_id?: string
    email?: string
    full_name?: string
    last_seen_at: string
  } = {
    last_seen_at: new Date().toISOString(),
  }
  if (typeof body.full_name === 'string') update.full_name = body.full_name

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('auth0_user_id', sub)
    .select('id, auth0_org_id, auth0_user_id, full_name, avatar_url, email')
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
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
      .from('users')
      .update({ avatar_url: avatarUrl, last_seen_at: new Date().toISOString() })
      .eq('auth0_user_id', sub)
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
      .from('users')
      .update({ avatar_url: null, last_seen_at: new Date().toISOString() })
      .eq('auth0_user_id', sub)
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

import { Router, type Request, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { jobRoleToTier } from '../lib/rbac.js'
import { auth0RolesForAccessRole, createOrgInvitation } from '../lib/auth0-admin.js'
import { sendSms } from '../lib/sns.js'
import { E164_RE } from '../lib/phone.js'

const router = Router()

function appBaseUrl(): string {
  const configuredUrl =
    process.env.OIDC_BASE_URL ??
    process.env.BASE_URL ??
    process.env.APP_URL ??
    'http://localhost:5173'
  const url = new URL(configuredUrl)

  if (url.protocol === 'https:' && url.port === '80') {
    url.port = ''
  }

  return url.toString().replace(/\/$/, '')
}

router.post(
  '/api/invitations',
  requireAuth,
  requireOrg,
  requirePermission('write:invitations'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!

    const { data: organization, error: organizationErr } = await supabaseAdmin
      .from('organizations')
      .select('name, status')
      .eq('auth0_org_id', orgId)
      .maybeSingle()
    if (organizationErr) {
      res.status(500).json({ error: organizationErr.message })
      return
    }
    if (!organization) {
      res.status(404).json({ error: 'Organization not found.' })
      return
    }
    if (organization.status !== 'active') {
      res.status(409).json({ error: 'Complete organization setup before inviting members.' })
      return
    }

    const body = (req.body ?? {}) as {
      email?: string
      phone_number?: string
      mobile_number?: string
      role?: string
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    // Two frontend invite forms exist (Team Members page sends mobile_number,
    // the legacy dialog sends phone_number) — accept either.
    const rawPhone = body.phone_number ?? body.mobile_number
    const phoneNumber = typeof rawPhone === 'string' ? rawPhone.trim() : ''
    if (!email && !phoneNumber) {
      res.status(400).json({ error: 'email or phone_number is required.' })
      return
    }
    if (phoneNumber && !E164_RE.test(phoneNumber)) {
      res.status(400).json({ error: 'phone_number must be in E.164 format, e.g. +27821234567.' })
      return
    }

    const tier = jobRoleToTier(body.role)

    // public.invitations is the real pending-invite table (no unique
    // constraint on auth0_org_id+email/phone_number, so re-inviting the same
    // address/number revokes any still-pending invite first rather than
    // relying on upsert). The real credentials/membership are created when
    // the invitee enrols via Auth0's custom-DB create.js, which reads this
    // row back by email OR phone_number and stamps accepted_at.
    let revokeQuery = supabaseAdmin
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('auth0_org_id', orgId)
      .is('accepted_at', null)
      .is('revoked_at', null)
    revokeQuery = email
      ? revokeQuery.eq('email', email)
      : revokeQuery.eq('phone_number', phoneNumber)
    await revokeQuery

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        auth0_org_id: orgId,
        email: email || null,
        phone_number: phoneNumber || null,
        role: tier,
        invited_by: req.auth?.sub,
      })
      .select('id, email, phone_number, role, token')
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    // Email invites go out via Auth0's native Organization Invitation API
    // (Universal Login email). Auth0 has no SMS-based org invitation, so
    // phone invites send our own link via Amazon SNS instead.
    if (email) {
      let auth0Roles: string[]
      try {
        auth0Roles = auth0RolesForAccessRole(tier)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Auth0 organization admin role is unavailable.'
        res.status(503).json({ error: message })
        return
      }

      // Auth0's organization invitation API requires a NON-EMPTY inviter.name.
      // The Team Members page only sends { email, role }, so fall back to the
      // authenticated caller's identity (never an empty string, which Auth0
      // rejects — silently breaking the invitation email).
      const inviterName = req.auth?.email || 'EasyOps'

      const clientId = process.env.AUTH0_CLIENT_ID
      if (!clientId) {
        res.status(500).json({
          error:
            'Auth0 client is not configured (AUTH0_CLIENT_ID); the invitation email cannot be sent.',
        })
        return
      }

      let auth0InvitationId: string | null
      try {
        auth0InvitationId =
          (await createOrgInvitation({
            orgId,
            inviterName,
            inviteeEmail: email,
            clientId,
            roles: auth0Roles,
          })) ?? null
      } catch (err) {
        console.error('Auth0 invitation send failed:', err)
        const message = err instanceof Error ? err.message : 'Unknown Auth0 error.'
        res.status(502).json({
          error: `The invitation was saved but the email could not be sent: ${message}`,
        })
        return
      }

      res.status(201).json({ success: true, invitationId: invitation.id, auth0InvitationId })
      return
    }

    const inviteUrl = `${appBaseUrl()}/accept-invite/${encodeURIComponent(invitation.token)}`
    const message = `You've been invited to join ${organization.name} on EasyOps. Tap to sign up: ${inviteUrl}`

    try {
      await sendSms(phoneNumber, message)
    } catch (err) {
      console.error('Invitation SMS send failed:', err)
      const message = err instanceof Error ? err.message : 'Unknown SMS error.'
      res.status(502).json({
        error: `The invitation was saved but the SMS could not be sent: ${message}`,
      })
      return
    }

    res.status(201).json({ success: true, invitationId: invitation.id })
  }
)

// Public lookup for the /accept-invite/:token landing page (invitee isn't logged in
// yet, so this route is intentionally unauthenticated).
router.get('/api/accept-invite/:token', async (req: Request, res: Response) => {
  const token = String(req.params.token || '').trim()
  if (!token) {
    res.status(400).json({ error: 'token is required.' })
    return
  }

  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .select('auth0_org_id, email, phone_number, accepted_at, revoked_at, expires_at')
    .eq('token', token)
    .maybeSingle()
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (
    !invitation ||
    invitation.accepted_at ||
    invitation.revoked_at ||
    new Date(invitation.expires_at) <= new Date()
  ) {
    res.status(404).json({ error: 'This invitation link is invalid or has expired.' })
    return
  }

  const { data: organization } = await supabaseAdmin
    .from('organizations')
    .select('name, slug')
    .eq('auth0_org_id', invitation.auth0_org_id)
    .maybeSingle()

  res.json({
    auth0_org_id: invitation.auth0_org_id,
    org_name: organization?.name ?? '',
    email: invitation.email,
    phone_number: invitation.phone_number,
  })
})

export default router

import { Router, type Response } from 'express'

import {
  requireAuth,
  requireOrg,
  requirePermission,
  type AuthedRequest,
} from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { jobRoleToTier } from '../lib/rbac.js'
import { createOrgInvitation } from '../lib/auth0-admin.js'

const router = Router()

router.post(
  '/api/invitations',
  requireAuth,
  requireOrg,
  requirePermission('write:invitations'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      email?: string
      role?: string
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) {
      res.status(400).json({ error: 'email is required.' })
      return
    }

    const tier = jobRoleToTier(body.role)

    // Auth0's organization invitation API requires a NON-EMPTY inviter.name.
    // The Team Members page only sends { email, role }, so fall back to the
    // authenticated caller's identity (never an empty string, which Auth0
    // rejects — silently breaking the invitation email).
    const inviterName = req.auth?.email || 'EasyOps'

    // public.invitations is the real pending-invite table (no unique
    // constraint on auth0_org_id+email, so re-inviting the same address
    // revokes any still-pending invite first rather than relying on upsert).
    // The real credentials/membership are created when the invitee enrols via
    // Auth0's custom-DB create.js, which reads this row back by email and
    // stamps accepted_at.
    await supabaseAdmin
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('auth0_org_id', orgId)
      .eq('email', email)
      .is('accepted_at', null)
      .is('revoked_at', null)

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        auth0_org_id: orgId,
        email,
        role: tier,
        invited_by: req.auth?.sub,
      })
      .select('id, email, role')
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    // The whole point of an invitation is the Auth0 email; without a client id
    // it cannot be sent, so treat a missing config as a hard error rather than
    // silently creating a Supabase row that never triggers an email.
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
        })) ?? null
    } catch (err) {
      console.error('Auth0 invitation send failed:', err)
      const message = err instanceof Error ? err.message : 'Unknown Auth0 error.'
      res.status(502).json({
        error: `The invitation was saved but the email could not be sent: ${message}`,
      })
      return
    }

    res.status(201).json({
      success: true,
      invitationId: invitation.id,
      auth0InvitationId,
    })
  }
)

export default router

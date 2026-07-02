import { Router, type Response } from 'express'

import { requireAuth, requireOrg, requireRole, type AuthedRequest } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { jobRoleToTier } from '../lib/rbac.js'
import { createOrgInvitation } from '../lib/auth0-admin.js'

const router = Router()

router.post(
  '/api/invitations',
  requireAuth,
  requireOrg,
  requireRole('admin'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!
    const body = (req.body ?? {}) as {
      email?: string
      full_name?: string
      role?: string
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) {
      res.status(400).json({ error: 'email is required.' })
      return
    }

    const tier = jobRoleToTier(body.role)

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .upsert({ org_id: orgId, email, role: tier }, { onConflict: 'org_id,email' })
      .select('id, email, role')
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    let auth0InvitationId: string | null = null
    const clientId = process.env.AUTH0_CLIENT_ID
    if (clientId) {
      try {
        auth0InvitationId =
          (await createOrgInvitation({
            orgId,
            inviterName: body.full_name?.trim() || 'EasyOps',
            inviteeEmail: email,
            clientId,
          })) ?? null
      } catch (err) {
        console.error('Auth0 invitation send failed:', err)
      }
    }

    res.status(201).json({
      success: true,
      invitationId: invitation.id,
      auth0InvitationId,
    })
  }
)

export default router

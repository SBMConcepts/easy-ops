/**
 * POST /api/access-requests
 *
 * Called when a user tries to log in but hasn't been added to any workspace.
 *
 * 1. Looks up the tenant whose domain matches the email domain in Supabase
 * 2. If found → inserts a pending_access_requests row and emails the admin
 * 3. If not found → still inserts the row with tenant_id = null (manual triage)
 *
 * Expected request body:
 *   { email: string, message?: string }
 *
 * Returns: 204 No Content on success
 */

import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend' // swap for SendGrid / Postmark / SES
import { randomUUID } from 'crypto'

const router = Router()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const resend = new Resend(process.env.RESEND_API_KEY!)

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/api/access-requests', async (req, res) => {
  const { email, message } = req.body as { email?: string; message?: string }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'A valid email is required.' })
  }

  const emailDomain = email.split('@')[1].toLowerCase()

  try {
    // ── Step 1: Find tenant by email domain ────────────────────────────────
    // Assumes your tenants table has a domains column (text[]) or a
    // separate tenant_domains table. Adjust the query to match your schema.
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, admin_email, auth0_org_id')
      .contains('domains', [emailDomain]) // postgres @> operator via Supabase
      .limit(1)

    const tenant = tenants?.[0] ?? null

    // ── Step 2: Insert pending access request ──────────────────────────────
    const requestId = randomUUID()

    const { error: insertError } = await supabase.from('access_requests').insert({
      id: requestId,
      email,
      tenant_id: tenant?.id ?? null,
      message: message ?? null,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      throw new Error(`Failed to save access request: ${insertError.message}`)
    }

    // ── Step 3: Email the admin (if tenant found) ──────────────────────────
    if (tenant?.admin_email) {
      const approveUrl = `${process.env.APP_URL}/api/access-requests/${requestId}/approve`

      await resend.emails.send({
        from: 'EasyOps <noreply@easyops.app>',
        to: tenant.admin_email,
        subject: `Access request from ${email}`,
        html: `
          <p>Hi,</p>
          <p><strong>${email}</strong> is requesting access to your <strong>${tenant.name}</strong> workspace on EasyOps.</p>
          ${message ? `<blockquote>${message}</blockquote>` : ''}
          <p>
            To add them, go to your <a href="${process.env.APP_URL}/app/employees">Employee Management</a> page
            and invite them, or click the button below to auto-add them with the default employee role:
          </p>
          <p>
            <a href="${approveUrl}" style="display:inline-block;padding:10px 20px;background:#534AB7;color:#fff;border-radius:6px;text-decoration:none;">
              Approve &amp; invite ${email}
            </a>
          </p>
          <p style="font-size:12px;color:#888;">This request was submitted via the EasyOps login page.</p>
        `,
      })
    }
    // If no tenant found, the request is queued for manual review by your support team.
    // You can add a Slack/webhook notification here.

    return res.status(204).send()
  } catch (err: unknown) {
    console.error('[POST /api/access-requests]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ message })
  }
})

// ── Approval shortcut (called from admin email link) ──────────────────────────

router.get('/api/access-requests/:id/approve', async (req, res) => {
  const { id } = req.params

  const { data: request, error } = await supabase
    .from('access_requests')
    .select('*, tenants(auth0_org_id, name)')
    .eq('id', id)
    .single()

  if (error || !request) {
    return res.status(404).send('Request not found.')
  }
  if (request.status !== 'pending') {
    return res.redirect(`${process.env.APP_URL}/app/employees?notice=already_processed`)
  }

  // Redirect admin to the employee management page pre-filled with the requester email
  const params = new URLSearchParams({ prefill_email: request.email, ref: id })
  return res.redirect(`${process.env.APP_URL}/app/employees?${params}`)
})

export default router

import { Router, type Request, type Response } from 'express'

const router = Router()

const SALES_INBOX = 'sales@easyops.co.za'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

router.post('/api/demo-request', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as {
    name?: string
    email?: string
    company?: string
    size?: string
    message?: string
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const company = typeof body.company === 'string' ? body.company.trim() : ''
  const size = typeof body.size === 'string' ? body.size.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !email || !company || !size) {
    res.status(400).json({ error: 'name, email, company and size are required.' })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[demo-request] RESEND_API_KEY is not configured.')
    res.status(500).json({ error: 'Email service is not configured.' })
    return
  }

  // Verified sender for the Resend domain. Falls back to Resend's onboarding
  // sender if a custom from-address has not been configured yet.
  const from = process.env.DEMO_REQUEST_FROM ?? 'EasyOps <onboarding@resend.dev>'

  const html = `
    <h2>New demo request</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
      <tr><td><strong>Work email</strong></td><td>${escapeHtml(email)}</td></tr>
      <tr><td><strong>Company</strong></td><td>${escapeHtml(company)}</td></tr>
      <tr><td><strong>Company size</strong></td><td>${escapeHtml(size)}</td></tr>
      <tr><td valign="top"><strong>Message</strong></td><td>${escapeHtml(message) || '—'}</td></tr>
    </table>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [SALES_INBOX],
        reply_to: email,
        subject: `Demo request — ${company}`,
        html,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('[demo-request] Resend error:', response.status, detail)
      res.status(502).json({ error: 'Failed to send the demo request.' })
      return
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[demo-request]', err)
    res.status(500).json({ error: 'Failed to send the demo request.' })
  }
})

export default router

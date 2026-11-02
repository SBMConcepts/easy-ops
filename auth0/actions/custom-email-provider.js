/**
 * Auth0 Custom Email Provider Action
 * Trigger: custom-email-provider (Dashboard-only — edit from Branding > Email
 * Provider > Custom provider > Configure, or via "Edit in Expanded Editor").
 *
 * Sends Auth0's rendered email (verification, password reset, etc.) through
 * Resend, the same provider used by server/routes/demo-request.ts.
 *
 * Required secrets (add via the Action's Secrets panel):
 *   RESEND_API_KEY   Resend API key (sending access only)
 *   EMAIL_FROM       Verified sender, e.g. "EasyOps <no-reply@easyops.co.za>"
 */

exports.onExecuteCustomEmailProvider = async (event, api) => {
  const { recipient, subject, as_html, as_text } = event.notification

  let response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${event.secrets.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: event.secrets.EMAIL_FROM,
        to: [recipient],
        subject,
        html: as_html,
        text: as_text,
      }),
    })
  } catch (err) {
    console.error(
      '[custom-email-provider] Resend request failed:',
      err && err.message ? err.message : err
    )
    // Network failure is transient — let Auth0 retry.
    api.notification.retry('Resend request failed')
    return
  }

  if (response.ok) return

  const detail = await response.text()
  console.error(`[custom-email-provider] Resend ${response.status}:`, detail)

  // 429/5xx are retryable; other 4xx (bad sender, invalid recipient) are permanent.
  if (response.status === 429 || response.status >= 500) {
    api.notification.retry(`Resend returned ${response.status}`)
  } else {
    api.notification.drop(`Resend rejected the email (${response.status})`)
  }
}

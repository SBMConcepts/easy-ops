// Pushes templates.json + HTML bodies to Auth0 (PATCH, falling back to POST when the template doesn't exist yet).
// Env: AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET (needs read/create/update:email_templates).
// Usage: node auth0/email-templates/apply.mjs [--dry-run]
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const dryRun = process.argv.includes('--dry-run')

const domain = process.env.AUTH0_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
const clientId = process.env.AUTH0_M2M_CLIENT_ID
const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET

const manifest = JSON.parse(await readFile(join(dir, 'templates.json'), 'utf8'))

const payloads = await Promise.all(
  manifest.templates.map(async (t) => {
    const { title, file, variables, ...fields } = t
    return {
      title,
      payload: { ...manifest.defaults, ...fields, body: await readFile(join(dir, file), 'utf8') },
    }
  })
)

if (dryRun) {
  for (const { title, payload } of payloads) {
    console.log(`${payload.template.padEnd(22)} ${payload.from}  |  ${payload.subject}  (${title})`)
  }
  process.exit(0)
}

if (!domain || !clientId || !clientSecret) {
  console.error('Missing AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID or AUTH0_M2M_CLIENT_SECRET')
  process.exit(1)
}

const tokenRes = await fetch(`https://${domain}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience: `https://${domain}/api/v2/`,
  }),
})
if (!tokenRes.ok) throw new Error(`Token request failed: ${tokenRes.status}`)
const { access_token } = await tokenRes.json()

const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }
const base = `https://${domain}/api/v2/email-templates`

let failed = false
for (const { title, payload } of payloads) {
  let res = await fetch(`${base}/${payload.template}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })
  if (res.status === 404)
    res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(payload) })
  if (res.ok) {
    console.log(`ok    ${payload.template}`)
  } else {
    failed = true
    console.error(`FAIL  ${payload.template} (${title}) ${res.status}: ${await res.text()}`)
  }
}
process.exit(failed ? 1 : 0)

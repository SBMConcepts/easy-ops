// Deploy the repo's Auth0 Actions to the tenant: find the action bound to a
// given trigger, update its code from the repo file, then deploy it.
import dotenv from 'dotenv'
import { readFile } from 'node:fs/promises'
dotenv.config({ path: '.env.local' })

const auth0 = await import('auth0')
const domain = process.env.AUTH0_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/$/, '')
const clientId = process.env.AUTH0_M2M_CLIENT_ID ?? process.env.AUTH0_CLIENT_ID!
const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET ?? process.env.AUTH0_CLIENT_SECRET!
const mgmt = new auth0.ManagementClient({ domain, clientId, clientSecret })

type ActionRow = {
  id: string
  name: string
  supported_triggers?: Array<{ id?: string }>
}

const jobs: Array<{ trigger: string; file: string }> = [
  { trigger: 'pre-user-registration', file: 'auth0/actions/pre-user-registration.js' },
]

const page = await mgmt.actions.list({ per_page: 100 } as never)
const actions = ((page as { data?: ActionRow[] }).data ?? []) as ActionRow[]

for (const job of jobs) {
  const match = actions.find((a) => (a.supported_triggers ?? []).some((t) => t.id === job.trigger))
  if (!match) {
    console.error(
      `No action found for trigger "${job.trigger}". Actions:`,
      actions.map((a) => `${a.name}[${(a.supported_triggers ?? []).map((t) => t.id).join(',')}]`)
    )
    process.exitCode = 1
    continue
  }
  const code = await readFile(job.file, 'utf8')
  await mgmt.actions.update(match.id, { code } as never)
  await mgmt.actions.deploy(match.id)
  console.log(`Deployed action "${match.name}" (${match.id}) for trigger ${job.trigger}`)
}

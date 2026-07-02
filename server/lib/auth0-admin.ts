import { ManagementClient } from 'auth0'

let _mgmt: ManagementClient | undefined

function mgmt(): ManagementClient {
  if (_mgmt) return _mgmt

  const domain = process.env.AUTH0_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const clientId = process.env.AUTH0_M2M_CLIENT_ID ?? process.env.AUTH0_CLIENT_ID
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET ?? process.env.AUTH0_CLIENT_SECRET

  if (!domain || !clientId || !clientSecret) {
    const missing = [
      ...(!domain ? ['AUTH0_DOMAIN'] : []),
      ...(!clientId ? ['AUTH0_M2M_CLIENT_ID'] : []),
      ...(!clientSecret ? ['AUTH0_M2M_CLIENT_SECRET'] : []),
    ]
    throw new Error(`Missing Auth0 Management env variable(s): ${missing.join(', ')}.`)
  }

  _mgmt = new ManagementClient({ domain, clientId, clientSecret })
  return _mgmt
}

export interface Auth0Org {
  id: string
  name?: string
  display_name?: string
}

function unwrap<T>(res: T | { data: T }): T {
  return res && typeof res === 'object' && 'data' in (res as { data: T })
    ? (res as { data: T }).data
    : (res as T)
}

export async function createAuth0Org(
  displayName: string,
  slug: string,
  metadata?: Record<string, string>
): Promise<Auth0Org> {
  const res = await mgmt().organizations.create({
    name: slug,
    display_name: displayName,
    ...(metadata ? { metadata } : {}),
  })
  const data = unwrap(res)
  if (!data?.id) {
    throw new Error('Auth0 organization was created but no id was returned.')
  }
  return { id: data.id, name: data.name, display_name: data.display_name }
}

async function resolveDbConnectionId(): Promise<string> {
  const explicitId = process.env.AUTH0_DB_CONNECTION_ID
  if (explicitId) return explicitId

  const name = process.env.AUTH0_DB_CONNECTION_NAME
  const page = await mgmt().connections.list({
    strategy: ['auth0'],
    ...(name ? { name } : {}),
  })
  const connections = (page.data ?? []).filter((c) => c.id)

  if (name) {
    const match = connections.find((c) => c.name === name)
    if (match?.id) return match.id
    throw new Error(`No Auth0 database connection named "${name}" was found.`)
  }

  if (connections.length === 1 && connections[0].id) return connections[0].id
  if (connections.length === 0) {
    throw new Error('No Auth0 database connection was found to enable on the organization.')
  }
  throw new Error(
    'Multiple Auth0 database connections exist; set AUTH0_DB_CONNECTION_ID or AUTH0_DB_CONNECTION_NAME to pick one.'
  )
}

export async function enableOrgConnection(orgId: string): Promise<void> {
  const connectionId = await resolveDbConnectionId()

  const existing = await mgmt().organizations.enabledConnections.list(orgId)
  const current = (existing.data ?? []).find((c) => c.connection_id === connectionId)

  if (current) {
    // Already enabled — ensure the signup/membership flags are correct (an org
    // enabled by an earlier version may have signup disabled, which breaks
    // invitation acceptance).
    if (!current.assign_membership_on_login || !current.is_signup_enabled) {
      await mgmt().organizations.enabledConnections.update(orgId, connectionId, {
        assign_membership_on_login: true,
        is_signup_enabled: true,
      })
    }
    return
  }

  await mgmt().organizations.enabledConnections.add(orgId, {
    connection_id: connectionId,
    assign_membership_on_login: true,
    is_signup_enabled: true,
  })
}

export async function addOrgMember(
  orgId: string,
  userId: string,
  roles: string[] = []
): Promise<void> {
  await mgmt().organizations.members.create(orgId, { members: [userId] })
  if (roles.length > 0) {
    await mgmt().organizations.members.roles.assign(orgId, userId, { roles })
  }
}

export async function createOrgInvitation(params: {
  orgId: string
  inviterName: string
  inviteeEmail: string
  clientId: string
  roles?: string[]
}): Promise<string | undefined> {
  const invitation = await mgmt().organizations.invitations.create(params.orgId, {
    inviter: { name: params.inviterName },
    invitee: { email: params.inviteeEmail },
    client_id: params.clientId,
    ...(params.roles && params.roles.length > 0 ? { roles: params.roles } : {}),
  })
  return unwrap(invitation)?.id
}

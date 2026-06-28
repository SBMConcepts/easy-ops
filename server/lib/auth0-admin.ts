// Thin wrappers over the Auth0 Management API (auth0 SDK v5) used for
// organization provisioning and membership management. Lazily instantiated so a
// missing env var only throws when the client is actually used.
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

// The auth0 SDK v5 sometimes returns the resource directly and sometimes wraps
// it in an ApiResponse `{ data }`. Normalise both shapes so reads never throw
// "Cannot read properties of undefined".
function unwrap<T>(res: T | { data: T }): T {
  return res && typeof res === 'object' && 'data' in (res as { data: T })
    ? (res as { data: T }).data
    : (res as T)
}

/** Create an Auth0 organization. `slug`/`name` is the URL-safe handle. */
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

/**
 * Add a user to an Auth0 organization and optionally assign organization roles.
 * `roles` are Auth0 role IDs; pass an empty array to skip role assignment.
 */
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

/** Create an organization invitation, emailing the invitee. Returns its id. */
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

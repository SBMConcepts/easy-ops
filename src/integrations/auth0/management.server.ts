// Auth0 Management API client (server-only). Uses M2M credentials to mint
// short-lived tokens that are cached in-memory per worker instance.
const TOKEN_TTL_SAFETY_SECONDS = 60

interface CachedToken {
  token: string
  expiresAt: number // epoch ms
}

let cached: CachedToken | null = null

function audience(): string {
  const domain = process.env.AUTH0_DOMAIN
  if (!domain) throw new Error('AUTH0_DOMAIN is not set')
  return `https://${domain}/api/v2/`
}

async function fetchManagementToken(): Promise<string> {
  const domain = process.env.AUTH0_DOMAIN!
  const client_id = process.env.AUTH0_MANAGEMENT_CLIENT_ID
  const client_secret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET
  if (!client_id || !client_secret) throw new Error('AUTH0 management credentials not set')

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id,
      client_secret,
      audience: audience(),
    }),
  })
  if (!res.ok) {
    throw new Error(`Auth0 Management token failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - TOKEN_TTL_SAFETY_SECONDS) * 1000,
  }
  return cached.token
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token
  return fetchManagementToken()
}

async function mgmtRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const domain = process.env.AUTH0_DOMAIN!
  const token = await getToken()
  const res = await fetch(`https://${domain}/api/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Auth0 Management ${path} failed: ${res.status} ${text}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---- Organizations ----
export interface Auth0Organization {
  id: string
  name: string
  display_name?: string
  metadata?: Record<string, string>
}

export function createOrganization(input: {
  name: string
  display_name: string
  metadata?: Record<string, string>
  enabled_connections?: Array<{ connection_id: string; assign_membership_on_login?: boolean }>
}) {
  return mgmtRequest<Auth0Organization>('/organizations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getOrganization(orgId: string) {
  return mgmtRequest<Auth0Organization>(`/organizations/${orgId}`)
}

export function deleteOrganization(orgId: string) {
  return mgmtRequest<void>(`/organizations/${orgId}`, { method: 'DELETE' })
}

// ---- Invitations ----
export interface Auth0Invitation {
  id: string
  organization_id: string
  invitation_url: string
  invitee: { email: string }
  expires_at: string
}

export function createInvitation(
  orgId: string,
  input: {
    inviter: { name: string }
    invitee: { email: string }
    client_id: string
    roles?: string[] // Auth0 role IDs
    connection_id?: string
    ttl_sec?: number
    send_invitation_email?: boolean
    app_metadata?: Record<string, unknown>
  }
) {
  return mgmtRequest<Auth0Invitation>(`/organizations/${orgId}/invitations`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// ---- Members & roles ----
export function addOrgMembers(orgId: string, userIds: string[]) {
  return mgmtRequest<void>(`/organizations/${orgId}/members`, {
    method: 'POST',
    body: JSON.stringify({ members: userIds }),
  })
}

export function removeOrgMember(orgId: string, userId: string) {
  return mgmtRequest<void>(`/organizations/${orgId}/members`, {
    method: 'DELETE',
    body: JSON.stringify({ members: [userId] }),
  })
}

export function assignOrgMemberRoles(orgId: string, userId: string, roleIds: string[]) {
  return mgmtRequest<void>(`/organizations/${orgId}/members/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roles: roleIds }),
  })
}

export function removeOrgMemberRoles(orgId: string, userId: string, roleIds: string[]) {
  return mgmtRequest<void>(`/organizations/${orgId}/members/${userId}/roles`, {
    method: 'DELETE',
    body: JSON.stringify({ roles: roleIds }),
  })
}

export interface Auth0Role {
  id: string
  name: string
  description?: string
}

export function listRoles() {
  return mgmtRequest<Auth0Role[]>('/roles')
}

// Resolves a tenant_role (owner/admin/...) to its Auth0 role id, cached per-process.
let _rolesByName: Map<string, string> | null = null
export async function resolveRoleIdByName(name: string): Promise<string | undefined> {
  if (!_rolesByName) {
    const roles = await listRoles()
    _rolesByName = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]))
  }
  return _rolesByName.get(name.toLowerCase())
}

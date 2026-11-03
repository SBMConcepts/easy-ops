import { ManagementClient } from 'auth0'
import type { AccessRole } from './rbac.js'

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

/** Minimal shape returned by the Auth0 Management API after creating an organization. */
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

/**
 * Create an Auth0 organization for a new tenant.
 *
 * `slug` is used as the Auth0 org `name` (must be URL-safe/unique per Auth0's
 * rules) while `displayName` is the human-facing label shown in prompts.
 */
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

/** Delete an Auth0 organization created by a provisioning attempt that later failed. */
export async function deleteAuth0Org(orgId: string): Promise<void> {
  await mgmt().organizations.delete(orgId)
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

/** Connections enabled on every org; Google/SMS are disabled until supported. */
async function resolveOrgConnectionIds(): Promise<string[]> {
  const ids = [
    await resolveDbConnectionId(),
    // Future: Auth0 rejects is_signup_enabled on non-database connections, so
    // enableOneOrgConnection must stop sending it for these before re-enabling.
    // process.env.AUTH0_GOOGLE_CONNECTION_ID?.trim(),
    // process.env.AUTH0_SMS_CONNECTION_ID?.trim(),
  ]
  return [...new Set(ids.filter((id): id is string => Boolean(id)))]
}

/**
 * Enable the configured login connection (database only for now) on an
 * organization so its members can log in and accept invitations.
 *
 * Auth0 orgs start with zero enabled connections. Both
 * `assign_membership_on_login` and `is_signup_enabled` must be true together
 * (Auth0 rejects `is_signup_enabled` alone) because invitation acceptance is
 * itself a signup. Idempotent: also repairs orgs enabled by an earlier
 * version of this function that only set one of the two flags.
 */
export async function enableOrgConnection(orgId: string): Promise<void> {
  const connectionIds = await resolveOrgConnectionIds()
  const existing = await mgmt().organizations.enabledConnections.list(orgId)

  for (const connectionId of connectionIds) {
    await enableOneOrgConnection(orgId, connectionId, existing.data ?? [])
  }
}

async function enableOneOrgConnection(
  orgId: string,
  connectionId: string,
  existing: {
    connection_id?: string
    assign_membership_on_login?: boolean
    is_signup_enabled?: boolean
  }[]
): Promise<void> {
  const current = existing.find((c) => c.connection_id === connectionId)

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

/** Return the Auth0 organization role that grants delegated full administration. */
export function getAuth0OrgAdminRoleId(): string {
  const roleId = process.env.AUTH0_ORG_ADMIN_ROLE_ID?.trim()
  if (!roleId) {
    throw new Error(
      'AUTH0_ORG_ADMIN_ROLE_ID is required to synchronize delegated organization administration.'
    )
  }
  return roleId
}

/** Map EasyOps access tiers to the Auth0 organization role used for delegation. */
export function auth0RolesForAccessRole(role: AccessRole): string[] {
  return role === 'owner' || role === 'admin' ? [getAuth0OrgAdminRoleId()] : []
}

/**
 * Mirror the delegated-admin role only. EasyOps authorization remains based on
 * public.org_members.role, so an Auth0 outage cannot change application access.
 */
export async function syncAuth0OrgAdminRole(
  orgId: string,
  userId: string,
  role: AccessRole
): Promise<void> {
  const adminRoleId = getAuth0OrgAdminRoleId()
  const assignedRoles = await mgmt().organizations.members.roles.list(orgId, userId, {
    per_page: 100,
  })
  const hasAdminRole = (assignedRoles.data ?? []).some((assigned) => assigned.id === adminRoleId)
  const needsAdminRole = role === 'owner' || role === 'admin'

  if (needsAdminRole && !hasAdminRole) {
    await mgmt().organizations.members.roles.assign(orgId, userId, { roles: [adminRoleId] })
  }
  if (!needsAdminRole && hasAdminRole) {
    await mgmt().organizations.members.roles.delete(orgId, userId, { roles: [adminRoleId] })
  }
}

/** Add a user to an Auth0 organization, optionally assigning organization roles. */
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

/** Create an Auth0 organization invitation; `sendEmail: false` skips delivery and relies on the returned URL. */
export async function createOrgInvitationDetails(params: {
  orgId: string
  inviterName: string
  inviteeEmail: string
  clientId: string
  roles?: string[]
  sendEmail?: boolean
}): Promise<{ id?: string; url?: string }> {
  const invitation = await mgmt().organizations.invitations.create(params.orgId, {
    inviter: { name: params.inviterName },
    invitee: { email: params.inviteeEmail },
    client_id: params.clientId,
    ...(params.roles && params.roles.length > 0 ? { roles: params.roles } : {}),
    ...(params.sendEmail === false ? { send_invitation_email: false } : {}),
  })
  const data = unwrap(invitation)
  return { id: data?.id, url: data?.invitation_url }
}

/** Create an Auth0 organization invitation and return its invitation id, if any. */
export async function createOrgInvitation(
  params: Omit<Parameters<typeof createOrgInvitationDetails>[0], 'sendEmail'>
): Promise<string | undefined> {
  return (await createOrgInvitationDetails(params)).id
}

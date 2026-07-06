// Fine-grained permission catalog for the EasyOps multi-tenant backend.
//
// This is the SINGLE SOURCE OF TRUTH for the `resource:action` scopes that gate
// API access. Each access tier (owner > admin > manager > member) maps to the
// exact set of scopes it may exercise. The mapping mirrors the row-level
// security policies in Supabase (see supabase/migrations + docs/permissions.txt)
// so that Express and Postgres authorize identically.
//
// Flow: on login, /api/auth/sync resolves the caller's role and returns
// `permissionsForRole(role)`. The Post-Login Action injects that array as a
// namespaced `permissions` claim on both tokens AND embeds it in the minted
// `supabase_jwt`, so the same scope list rides every request to both platforms.

import type { AccessRole } from './rbac.js'

/** Every scope the system understands. Keep in sync with docs/permissions.txt. */
export const ALL_PERMISSIONS = [
  'read:org_members',
  'write:org_members',
  'delete:org_members',
  'read:users',
  'read:user_credentials',
  'write:user_credentials',
  'delete:user_credentials',
  'read:organizations',
  'write:organizations',
  'delete:organizations',
  'read:org_roles',
  'write:org_roles',
  'delete:org_roles',
  'read:subscriptions',
  'write:subscriptions',
  'delete:subscriptions',
  'read:org_sites',
  'write:org_sites',
  'delete:org_sites',
  'read:org_departments',
  'write:org_departments',
  'delete:org_departments',
  'read:org_attendance',
  'write:org_attendance',
  'delete:org_attendance',
  'read:invitations',
  'write:invitations',
  'delete:invitations',
  'read:audit_logs',
  'write:audit_logs',
  'delete:audit_logs',
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]

// Managers can operate org structure (sites, departments, attendance) and manage
// their own credentials, but cannot touch members, roles, subscriptions,
// invitations, or read audit logs.
const MANAGER_PERMISSIONS: readonly Permission[] = [
  'read:org_members',
  'read:users',
  'read:user_credentials',
  'write:user_credentials',
  'delete:user_credentials',
  'read:organizations',
  'read:org_roles',
  'read:org_sites',
  'write:org_sites',
  'delete:org_sites',
  'read:org_departments',
  'write:org_departments',
  'read:org_attendance',
  'write:org_attendance',
  'write:audit_logs',
]

// Members have read access to org structure plus write/delete on their OWN
// credentials and audit-log inserts. Row ownership is enforced in the handler.
const MEMBER_PERMISSIONS: readonly Permission[] = [
  'read:org_members',
  'read:users',
  'read:user_credentials',
  'write:user_credentials',
  'delete:user_credentials',
  'read:organizations',
  'read:org_roles',
  'read:org_sites',
  'read:org_departments',
  'read:org_attendance',
  'write:audit_logs',
]

/**
 * Role → permission set. `owner` and `admin` hold every scope (admin's effective
 * permissions match owner per the RLS policy role checks).
 */
export const ROLE_PERMISSIONS: Record<AccessRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
}

/** Resolve the full scope list for a role. Unknown/empty roles get no scopes. */
export function permissionsForRole(role: string | null | undefined): Permission[] {
  if (!role || !(role in ROLE_PERMISSIONS)) return []
  return [...ROLE_PERMISSIONS[role as AccessRole]]
}

/** True when the given role holds the specified scope. */
export function roleHasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false
  return ROLE_PERMISSIONS[role as AccessRole].includes(permission)
}

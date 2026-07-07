// Frontend mirror of the server permission catalog (server/lib/permissions.ts).
// The runtime list of a user's granted scopes is delivered by GET /api/userinfo
// (derived from the DB-authoritative role), and gated in the UI via
// useAuthRole().hasPermission(). Keep this union in sync with the server.

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

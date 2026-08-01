// Role-based access control for the EasyOps multi-tenant backend.
//
// Access tiers map 1:1 to the `org_members.role` CHECK constraint in the
// database (owner > admin > manager > member). These are the ONLY values used
// for gating API access.

// Job roles live in `org_roles` (`name` is a free-form title; the optional
// `base_role` column is the `org_role` enum: owner, admin, manager, member).
// They describe a person's position in the org and are stored separately. When
// a job role needs to be resolved to an access tier (e.g. accepting an invite,
// syncing membership), use `jobRoleToTier`.

export type AccessRole = 'owner' | 'admin' | 'manager' | 'member'

export const ACCESS_ROLES: readonly AccessRole[] = ['owner', 'admin', 'manager', 'member']

// Higher number = more privilege. Used by `hasRequiredRole`.
const ROLE_TIERS: Record<AccessRole, number> = {
  member: 0,
  manager: 1,
  admin: 2,
  owner: 3,
}

/** True when `role` meets or exceeds the `required` access tier. */
export function hasRequiredRole(role: string | null | undefined, required: AccessRole): boolean {
  if (!role || !(role in ROLE_TIERS)) return false
  return ROLE_TIERS[role as AccessRole] >= ROLE_TIERS[required]
}

/** Narrowing helper: is the value a valid access tier? */
export function isAccessRole(value: unknown): value is AccessRole {
  return typeof value === 'string' && (ACCESS_ROLES as readonly string[]).includes(value)
}

// Documented mapping from the `org_role` enum values down to the four access
// tiers. This is the single source of truth for that mapping; keep it in sync
// with the frontend (src/contexts/AuthContext.tsx).
const JOB_ROLE_TO_TIER: Record<string, AccessRole> = {
  owner: 'owner',
  admin: 'admin',
  manager: 'manager',
  member: 'member',
}

/** Resolve a job role (or any incoming role string) to an access tier. */
export function jobRoleToTier(jobRole: string | null | undefined): AccessRole {
  // The role is chosen by the inviter when an invitation is sent, so an unknown
  // or missing role must NOT silently become 'owner'. Default to the least-
  // privileged tier instead; 'owner' is only ever granted by an explicit role.
  if (!jobRole) return 'member'
  if (isAccessRole(jobRole)) return jobRole
  return JOB_ROLE_TO_TIER[jobRole] ?? 'member'
}

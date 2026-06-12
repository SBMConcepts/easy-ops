// =============================================================================
// Auth0 native-RBAC sync — mirrors the DB source of truth into Auth0.
// =============================================================================
// Run: `npm run auth0:sync-rbac` (uses tsx).
//
// What it does (idempotent):
//   1. Reads every value of public.app_permission and upserts them as scopes on
//      the custom API (AUTH0_AUDIENCE).
//   2. Reads public.role_permissions and, for each tenant_role, ensures a
//      matching Auth0 role exists and holds exactly the granted permissions
//      (adds missing, removes extras).
//
// The DB stays authoritative; this only pushes outward for Auth0-dashboard
// visibility and native-RBAC enforcement. Runtime gating is driven by the
// post-login claim injection (see auth0/actions/post-login.js).
//
// Required env: SUPABASE_DATABASE_URL, AUTH0_DOMAIN, AUTH0_AUDIENCE,
// AUTH0_MANAGEMENT_CLIENT_ID, AUTH0_MANAGEMENT_CLIENT_SECRET.
import 'dotenv/config'
import { getPool } from '../lib/db.js'
import * as mgmt from '../lib/auth0-management.js'

// Human-readable descriptions for the API scope list. Unlisted permissions fall
// back to a generated label. Keep aligned with docs/permissions.txt.
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'read:tenant': 'View tenant/organization settings and profile',
  'write:tenant': 'Update tenant/organization settings',
  'admin:tenant': 'Destructive tenant administration (delete org, billing owner)',
  'read:own-profile': 'View own user profile',
  'update:own-profile': 'Edit own user profile',
  'read:members': 'List organization members',
  'invite:members': 'Invite or add organization members',
  'manage:members': 'Edit or remove organization members',
  'manage:roles': "Change a member's role",
  'read:attendance': 'View attendance records',
  'write:attendance': 'Clock in/out and edit own attendance',
  'verify:attendance': "Approve or verify others' attendance",
  'read:sites': 'View sites',
  'manage:sites': 'Create, edit or delete sites',
  'read:departments': 'View departments',
  'manage:departments': 'Create, edit or delete departments',
  'read:shifts': 'View shift schedules',
  'manage:shifts': 'Create and assign shift schedules',
  'read:access-requests': 'View pending access/join requests',
  'approve:access-requests': 'Approve access requests and invite',
  'read:compliance': 'View labour-compliance reports',
  'read:reports': 'View analytics and reports',
  'export:reports': 'Export analytics and reports',
  'read:tenant-analytics': 'View organization-wide dashboards',
  'read:billing': 'View billing and subscription',
  'manage:billing': 'Manage billing and subscription',
  'read:audit': 'View the audit log',
  'export:audit': 'Export the audit log',
  'manage:security': 'Manage MFA/SSO and security policy',
  'manage:integrations': 'Configure third-party integrations',
  'read:payroll': 'View payroll',
  'manage:payroll': 'Run and manage payroll',
  'read:benefits': 'View benefits',
  'manage:benefits': 'Administer benefits',
}

function describe(permission: string): string {
  return PERMISSION_DESCRIPTIONS[permission] ?? permission
}

async function main(): Promise<void> {
  const audience = process.env.AUTH0_AUDIENCE
  if (!audience) throw new Error('AUTH0_AUDIENCE is not set')

  const pool = getPool()

  // 1. Desired scopes = every enum value.
  const enumRes = await pool.query<{ permission: string }>(
    `SELECT unnest(enum_range(NULL::public.app_permission))::text AS permission ORDER BY permission`
  )
  const allPermissions = enumRes.rows.map((r) => r.permission)
  console.log(`Found ${allPermissions.length} permissions in public.app_permission.`)

  // 2. Role → permission grants.
  const rpRes = await pool.query<{ role: string; permission: string }>(
    `SELECT role::text AS role, permission::text AS permission FROM public.role_permissions ORDER BY role, permission`
  )
  const grantsByRole = new Map<string, Set<string>>()
  for (const { role, permission } of rpRes.rows) {
    if (!grantsByRole.has(role)) grantsByRole.set(role, new Set())
    grantsByRole.get(role)!.add(permission)
  }
  console.log(`Found grants for ${grantsByRole.size} roles.`)

  // 3. Upsert API scopes (existing ∪ desired so nothing is dropped).
  const api = await mgmt.getResourceServerByIdentifier(audience)
  if (!api) throw new Error(`No Auth0 API (resource server) with identifier ${audience}`)
  const existingScopeValues = new Set((api.scopes ?? []).map((s) => s.value))
  const mergedScopes = [
    ...(api.scopes ?? []),
    ...allPermissions
      .filter((p) => !existingScopeValues.has(p))
      .map((p) => ({ value: p, description: describe(p) })),
  ]
  await mgmt.updateResourceServerScopes(api.id, mergedScopes)
  console.log(`API scopes synced: ${mergedScopes.length} total.`)

  // 4. Per role: ensure the Auth0 role exists and holds exactly its grants.
  for (const [role, desired] of grantsByRole) {
    let roleId = await mgmt.resolveRoleIdByName(role)
    if (!roleId) {
      const created = await mgmt.createRole(role, `EasyOps ${role} role`)
      roleId = created.id
      mgmt.clearRoleCache()
      console.log(`Created Auth0 role '${role}'.`)
    }

    const current = await mgmt.getRolePermissions(roleId)
    const currentForApi = new Set(
      current.filter((p) => p.resource_server_identifier === audience).map((p) => p.permission_name)
    )

    const toAdd = [...desired].filter((p) => !currentForApi.has(p))
    const toRemove = [...currentForApi].filter((p) => !desired.has(p))

    await mgmt.addRolePermissions(roleId, audience, toAdd)
    await mgmt.removeRolePermissions(roleId, audience, toRemove)
    console.log(`Role '${role}': +${toAdd.length} / -${toRemove.length} permissions.`)
  }

  console.log('Auth0 RBAC sync complete.')
  await pool.end()
}

main().catch((err) => {
  console.error('Auth0 RBAC sync failed:', err)
  process.exitCode = 1
})

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
// post-login claim injection.

import '../lib/load-env.js'
import { getPool } from '../lib/db.js'
import * as mgmt from '../lib/auth0-management.js'

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'read:tenant': 'View workspace settings',
  'write:tenant': 'Update workspace settings',
  'admin:tenant': 'Full administrative control over workspace',
  'read:members': 'View workspace members',
  'invite:members': 'Invite new users to workspace',
  'manage:members': 'Modify or remove workspace members',
  'read:attendance': 'View attendance records',
  'write:attendance': 'Modify or input attendance records',
  'verify:attendance': 'Approve and lock attendance records',
  'manage:departments': 'Create and edit departments',
  'manage:sites': 'Create and edit physical sites',
  'manage:shifts': 'Create and edit operational shifts',
  'manage:roles': 'Manage custom workspace roles',
  'read:audit': 'View security audit logs',
  'manage:billing': 'Manage subscription and billing',
}

function describe(permission: string): string {
  return SCOPE_DESCRIPTIONS[permission] || `Allows ${permission.replace(':', ' ')}`
}

async function run() {
  const audience = process.env.AUTH0_AUDIENCE
  if (!audience) throw new Error('AUTH0_AUDIENCE is required.')

  const pool = getPool()

  // 1. Fetch the authoritative schema definitions from Postgres
  console.log('Fetching source of truth from Supabase...')
  const permEnumRes = await pool.query(
    `SELECT enumlabel FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     WHERE t.typname = 'app_permission'`
  )
  const allPermissions = permEnumRes.rows.map((r) => r.enumlabel as string)

  const roleGrantsRes = await pool.query(
    `SELECT role, permission FROM public.role_permissions ORDER BY role, permission`
  )

  const grantsByRole = new Map<string, Set<string>>()
  for (const row of roleGrantsRes.rows) {
    if (!grantsByRole.has(row.role)) grantsByRole.set(row.role, new Set())
    grantsByRole.get(row.role)!.add(row.permission)
  }

  // 2. Fetch the target Auth0 Resource Server (API)
  const api = await mgmt.getResourceServerByIdentifier(audience)
  if (!api || !api.id) throw new Error(`API with identifier ${audience} not found in Auth0.`)

  // 3. Upsert Scopes to the API
  console.log(`Syncing ${allPermissions.length} scopes to API ${audience}...`)
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

    console.log(`Synced role '${role}': +${toAdd.length} / -${toRemove.length} permissions.`)
  }

  console.log('✅ Auth0 RBAC synchronization complete.')
  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal sync error:', err)
  process.exit(1)
})

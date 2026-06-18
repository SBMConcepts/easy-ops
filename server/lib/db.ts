import pg from 'pg'
import type { PoolClient } from 'pg'
import type { AuthContext } from './auth.js'

const { Pool } = pg

const CLAIM_NAMESPACE = process.env.AUTH0_CLAIM_NS ?? 'https://easy-ops-za.vercel.app/'

let _pool: InstanceType<typeof Pool> | null = null

export function getPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    const connectionString = process.env.SUPABASE_DATABASE_URL
    if (!connectionString) throw new Error('SUPABASE_DATABASE_URL is not set')

    _pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return _pool
}

// Executes a database query under the strict scope of the authenticated user.
// This simulates Supabase's native auth context, allowing Express to trigger
// Postgres Row Level Security (RLS) identically to frontend calls.
export async function withTenantContext<T>(
  ctx: AuthContext,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Construct a simulated JWT payload that matches your custom Supabase functions
    // e.g. current_user_id() uses ->> 'sub'
    // e.g. current_tenant_id() uses ->> 'org_id'
    const simulatedJwtClaims = {
      sub: ctx.auth0UserId,
      org_id: ctx.orgId, // Injected at the root so auth.jwt()->>'org_id' works perfectly
      [`${CLAIM_NAMESPACE}org_id`]: ctx.orgId,
      [`${CLAIM_NAMESPACE}role`]: ctx.role,
    }

    // Inject the simulated JWT into the Postgres session configuration.
    // The `true` parameter makes this variable locally scoped to this transaction only.
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(simulatedJwtClaims),
    ])

    const result = await callback(client)

    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null)
    throw err
  } finally {
    client.release()
  }
}

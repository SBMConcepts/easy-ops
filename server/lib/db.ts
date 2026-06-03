import pg from 'pg'
import type { PoolClient } from 'pg'
import type { AuthContext } from './auth.js'

const { Pool } = pg

let _pool: InstanceType<typeof Pool> | null = null

/**
 * Returns a lazily-initialised pg Pool that connects to Supabase via its
 * Supavisor pooled connection string (Transaction mode, port 6543/5432).
 */
export function getPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    const connectionString = process.env.SUPABASE_DATABASE_URL
    if (!connectionString) {
      throw new Error('SUPABASE_DATABASE_URL environment variable is not set')
    }
    _pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return _pool
}

/**
 * A secure transaction wrapper that enforces Tenant Isolation (RLS).
 * It automatically injects the parsed JWT claims into PostgreSQL's session state
 * so that Supabase's `auth.jwt()` function works perfectly for backend queries.
 * * @param ctx - The validated AuthContext from the user's JWT
 * @param callback - The database operations to execute within this safe context
 */
export async function withTenantContext<T>(
  ctx: AuthContext,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Structure a mock JWT payload matching your frontend tokens
    const simulatedJwtClaims = {
      sub: ctx.auth0UserId,
      'https://easy-ops-za.vercel.app/org_id': ctx.orgId,
      'https://easy-ops-za.vercel.app/role': ctx.role,
    }

    // 2. Inject this directly into the Postgres config state for this transaction
    // This makes `auth.jwt()` in your RLS policies behave identically to client-side calls
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(simulatedJwtClaims),
    ])

    // 3. Execute the developer's queries securely
    const result = await callback(client)

    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

import pg from 'pg'
import type { PoolClient } from 'pg'

const { Pool } = pg

let _pool: InstanceType<typeof Pool> | null = null

/**
 * Returns a lazily-initialised pg Pool that connects to Supabase via its
 * Supavisor pooled connection string (Transaction mode, port 5432).
 */
export function getPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    const connectionString = process.env.SUPABASE_DATABASE_URL
    if (!connectionString) {
      throw new Error('SUPABASE_DATABASE_URL environment variable is not set')
    }
    _pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return _pool
}

/**
 * A secure transaction wrapper that enforces Tenant Isolation (RLS).
 * * It automatically handles BEGIN/COMMIT/ROLLBACK and injects the
 * Postgres session variables required by your multi-tenant RLS policies.
 * * @param localTenantId - The UUID of the tenant from public.tenants
 * @param localUserId - The UUID of the user from public.users
 * @param callback - The database operations to execute within this safe context
 */
export async function withTenantContext<T>(
  localTenantId: string,
  localUserId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Inject the isolated context for this specific transaction
    await client.query('SET LOCAL app.current_tenant_id = $1', [localTenantId])
    await client.query('SET LOCAL app.current_user_id = $1', [localUserId])

    // Execute the developer's queries securely
    const result = await callback(client)

    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Transaction rolled back due to error:', error)
    throw error
  } finally {
    client.release()
  }
}

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
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return _pool
}

export async function withTenantContext<T>(
  ctx: AuthContext,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const simulatedJwtClaims = {
      sub: ctx.auth0UserId,
      [`${CLAIM_NAMESPACE}org_id`]: ctx.orgId,
      [`${CLAIM_NAMESPACE}role`]: ctx.role,
    }

    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(simulatedJwtClaims),
    ])

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

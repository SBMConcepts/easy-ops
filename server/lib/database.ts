import { Pool, type PoolClient } from 'pg'

let pool: Pool | undefined

function getPool(): Pool {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL or SUPABASE_DATABASE_URL.')
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  return pool
}

/** Execute related writes on one connection so they commit or roll back together. */
export async function withDatabaseTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
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

import pg from 'pg'

const { Pool } = pg

let _pool: InstanceType<typeof Pool> | null = null

/**
 * Returns a lazily-initialised pg Pool that connects to Supabase via its
 * Supavisor pooled connection string (Transaction mode, port 6543).
 *
 * The Pool is created on first call so that dotenv has already populated
 * process.env by the time the connection string is read.
 *
 * Set DATABASE_URL in your .env to:
 *   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 */
export function getPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _pool = new Pool({
      connectionString,
      // Supabase requires SSL; rejectUnauthorized: false accepts their self-signed cert
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return _pool
}

import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pool: Pool }

export const dbPool =
  globalForPg.pool ||
  new Pool({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    max: 10, // Keeps connection footprints light across serverless invocations
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

if (process.env.NODE_ENV !== 'production') globalForPg.pool = dbPool

// Execute a .sql file against the live DB via pg (simple query protocol so
// multi-statement + dollar-quoted + begin/commit files run as one script).
// Usage: node server/scripts/run-sql.mjs <path-to-sql>
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env' })

const file = process.argv[2]
if (!file) {
  console.error('Usage: node server/scripts/run-sql.mjs <path-to-sql>')
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL
if (!connectionString) {
  console.error('No DATABASE_URL / SUPABASE_DATABASE_URL in env')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
client.on('notice', (n) => console.log('NOTICE:', n.message))

try {
  await client.connect()
  await client.query(sql)
  console.log(`OK: applied ${file}`)
} catch (err) {
  console.error(`ERROR applying ${file}:`, err.message)
  if (err.detail) console.error('  detail:', err.detail)
  if (err.hint) console.error('  hint:', err.hint)
  if (err.where) console.error('  where:', err.where)
  process.exitCode = 1
} finally {
  await client.end()
}

import { config } from 'dotenv'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

config({ path: '.env', override: true })

const url = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL
if (!url) {
  console.error('no DATABASE_URL / SUPABASE_DATABASE_URL in env')
  process.exit(1)
}

console.log('generating types from live db...')
const out = execSync(`npx --yes supabase gen types typescript --db-url "${url}" --schema public`, {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})

const targets = ['server/types/supabase.ts', 'src/integrations/supabase/types.ts']
for (const t of targets) {
  writeFileSync(t, out, 'utf8')
  console.log(`wrote ${t} (${out.length} bytes)`)
}

// Loads environment variables for local/standalone runs. The project keeps its
// secrets in `.env.local` (not `.env`), so the default `dotenv/config` import —
// which only reads `.env` — leaves AUTH0_* / SUPABASE_* undefined. This module
// loads `.env.local` first, then `.env` as a fallback, and never overrides
// variables already present in the real environment (e.g. Vercel, CI), where no
// dotfile exists and these calls are harmless no-ops.
//
// Import this as the FIRST import of any entrypoint so the variables are set
// before other modules read process.env at import time.
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

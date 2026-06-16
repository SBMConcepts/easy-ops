// Supabase browser client. Supabase Auth (GoTrue) owns the session: the client
// persists it, refreshes tokens automatically, and attaches the user's JWT to
// every request so Postgres RLS evaluates auth.uid() and the membership-based
// tenant policies. A single client serves both anonymous and authenticated
// access — when no session exists requests run as the `anon` role.
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ['VITE_SUPABASE_URL'] : []),
    ...(!SUPABASE_PUBLISHABLE_KEY ? ['VITE_SUPABASE_PUBLISHABLE_KEY'] : []),
  ]
  const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`
  console.error(`[Supabase] ${message}`)
  throw new Error(message)
}

// Canonical singleton — valid from first render. Authenticated requests are
// upgraded automatically once a session exists; no per-request token wiring.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

/**
 * Returns the shared Supabase client. Kept as a function for call sites that
 * previously created their own client instance.
 */
export function createSupabaseClient() {
  return supabase
}

/**
 * Backwards-compatible alias for public/unauthenticated access (e.g. the
 * access-request intake form). Identical to `supabase`; when no user is signed
 * in, requests run under the `anon` role.
 */
export const supabasePublic = supabase

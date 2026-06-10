// Browser Supabase clients for this app.
// - `supabasePublic`: anonymous singleton (RLS as the anon role) for public
//   reads/writes (e.g. access-request intake) before a user signs in.
// - `createSupabaseClient(token)`: per-session client that forwards the Auth0
//   access token as the Authorization header so Postgres RLS sees the user's
//   JWT claims. Built by DatabaseContext once the user is authenticated.
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function readSupabaseEnv() {
  // Use import.meta.env for client-side (Vite build-time replacement);
  // fall back to process.env for SSR.
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ]
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase Cloud Platform.`
    console.error(`[Supabase] ${message}`)
    throw new Error(message)
  }

  return { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY }
}

function createAnonClient() {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = readSupabaseEnv()
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

// Creates a client that authenticates requests with the supplied Auth0 access
// token, so Postgres RLS policies evaluate against the user's JWT claims.
// `persistSession` is disabled — the token's lifecycle is owned by Auth0.
export function createSupabaseClient(token: string) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = readSupabaseEnv()
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

let _supabasePublic: ReturnType<typeof createAnonClient> | undefined

// Lazily-instantiated anonymous singleton. Import like:
//   import { supabasePublic } from "@/integrations/supabase/client";
export const supabasePublic = new Proxy({} as ReturnType<typeof createAnonClient>, {
  get(_, prop, receiver) {
    if (!_supabasePublic) _supabasePublic = createAnonClient()
    return Reflect.get(_supabasePublic, prop, receiver)
  },
})

// Backward-compatible alias for the anonymous singleton.
export const supabase = supabasePublic

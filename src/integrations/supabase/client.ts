// Supabase browser client wired for Auth0 third-party auth. The Supabase
// project must be configured in Dashboard -> Auth -> Third-Party Auth to
// trust the Auth0 issuer; every request below carries the Auth0 access
// token, which Supabase verifies and exposes to RLS via auth.jwt().
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { getAuth0AccessToken } from '../auth0/token-store'

export function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ]
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`
    console.error(`[Supabase] ${message}`)
    throw new Error(message)
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => getAuth0AccessToken() ?? '',
    auth: {
      // Auth0 owns the session; disable Supabase's own session machinery.
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient()
    return Reflect.get(_supabase, prop, receiver)
  },
})

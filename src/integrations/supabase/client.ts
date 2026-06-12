// Supabase browser client wired for Auth0 third-party auth. The Supabase
// project must be configured in Dashboard -> Auth -> Third-Party Auth to
// trust the Auth0 issuer; authenticated requests carry the Auth0 access
// token, which Supabase verifies and exposes to RLS via auth.jwt().
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Optional token provider. When supplied, the returned client forwards the
// current Auth0 access token on every request so Postgres RLS evaluates the
// user's JWT claims. Omit it for anonymous/public access.
type TokenProvider = () => Promise<string | null>

export function createSupabaseClient(getToken?: TokenProvider) {
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
    ...(getToken ? { accessToken: async () => (await getToken()) ?? '' } : {}),
    auth: {
      // Auth0 owns the session; disable Supabase's own session machinery.
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

let _supabasePublic: ReturnType<typeof createSupabaseClient> | undefined

// Anonymous (publishable-key) Supabase client for public, unauthenticated
// access such as the access-request intake form. Import like:
// import { supabasePublic } from "@/integrations/supabase/client";
export const supabasePublic = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabasePublic) _supabasePublic = createSupabaseClient()
    return Reflect.get(_supabasePublic, prop, receiver)
  },
})

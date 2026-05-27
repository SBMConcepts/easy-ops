import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Create a Supabase client authenticated with an Auth0 access token.
 *
 * We forward the Auth0 JWT as the Authorization header, so Supabase validates it
 * and `auth.uid()` in RLS equals the Auth0 `sub`.
 */
export function createSupabaseClient(accessToken?: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: {
      // Let Auth0 own the session — don't let Supabase try to manage it.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  // Forward token to Realtime + Edge Functions as well
  if (accessToken) {
    client.realtime.setAuth(accessToken)
    client.functions.setAuth(accessToken)
  }

  return client
}

/**
 * Unauthenticated Supabase client for public/anonymous operations.
 * (Uses the same createSupabaseClient setup but without an Auth0 token.)
 */
export const supabasePublic = createSupabaseClient()

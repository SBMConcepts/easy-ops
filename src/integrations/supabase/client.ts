import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY as string

/**
 * Create a Supabase client authenticated with an Auth0 access token.
 *
 * By injecting the Auth0 JWT as the Authorization header Supabase will
 * validate the token using your Third-party Auth / custom JWT settings,
 * and `auth.uid()` inside RLS policies will equal the Auth0 `sub` value.
 *
 * Usage inside a React hook:
 *   const token = await getAccessTokenSilently()
 *   const db = createSupabaseClient(token)
 */
export function createSupabaseClient(accessToken?: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    auth: {
      // Let Auth0 own the session — don't let Supabase try to manage it.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  if (accessToken) {
    // Forward Auth0 token to Realtime and Edge Functions
    client.realtime.setAuth(accessToken)
    client.functions.setAuth(accessToken)
  }

  return client
}

/**
 * An unauthenticated Supabase client suitable for public tables
 * (e.g. inserting sales leads before the user is logged in).
 */
export const supabasePublic = createSupabaseClient()

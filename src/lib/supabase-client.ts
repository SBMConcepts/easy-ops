import { createClient } from '@supabase/supabase-js'

/** Build a Supabase client authenticated with a bearer access token, session persistence disabled. */
export function createSupabaseClient(accessToken: string) {
  return createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

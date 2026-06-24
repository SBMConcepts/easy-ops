import { createClient } from '@supabase/supabase-js'

// Call this wherever you need a Supabase client in a Server Component or API route
export function createSupabaseClient(accessToken: string) {
  return createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        // This is what makes RLS work — Supabase reads org_id from this token
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      // Disable Supabase's own auth — Auth0 owns identity
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

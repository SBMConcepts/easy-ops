import { createClient } from '@supabase/supabase-js'

// Singleton — this bypasses ALL RLS, use only in trusted server code
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

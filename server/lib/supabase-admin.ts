// Server-side Supabase client with the service-role key — bypasses RLS.
// Use ONLY for trusted server-side operations (admin provisioning, etc.).
// Never import this from client/`src` code; the service-role key must never
// reach the browser. Mirrors the lazy-init pattern used elsewhere in server/lib.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ]
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}.`)
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined

// Lazily instantiated so a missing env var only throws when the admin client is
// actually used, not at module import time. Import like:
//   import { supabaseAdmin } from '../lib/supabase-admin.js'
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient()
    return Reflect.get(_supabaseAdmin, prop, receiver)
  },
})

// Transitional untyped handle for Schema v2 tables (organizations, org_members,
// subscriptions, invitations, audit_logs) that are not yet present in the
// generated `Database` types. Use for those tables until `supabase gen types`
// is re-run against the v2 migration, after which callers can switch back to
// the typed `supabaseAdmin` and this export can be removed.
export const supabaseAdminV2 = supabaseAdmin as unknown as SupabaseClient

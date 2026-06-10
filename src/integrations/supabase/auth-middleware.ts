// Server-side Supabase access for Next.js route handlers, scoped to the
// verified Auth0 user (the canonical identity provider). The Auth0 access token
// is verified via JWKS (see ../auth0/middleware.server) and then forwarded to
// Supabase so Postgres RLS policies evaluate against the user's JWT claims.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { requireAuth0Auth, AuthError, type Auth0Context } from '../auth0/middleware.server'

export interface SupabaseRequestContext {
  supabase: SupabaseClient<Database>
  auth: Auth0Context
}

function readSupabaseEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ]
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`
    console.error(`[Supabase] ${message}`)
    throw new AuthError(message, 500)
  }
  return { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY }
}

// Verifies the request's Auth0 access token and returns both the typed Auth0
// context and a Supabase client that forwards the same token (so RLS sees the
// user's claims). Throws AuthError(401) when the token is missing or invalid.
export async function getSupabaseForRequest(req: Request): Promise<SupabaseRequestContext> {
  const auth = await requireAuth0Auth(req)
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = readSupabaseEnv()
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${auth.token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return { supabase, auth }
}

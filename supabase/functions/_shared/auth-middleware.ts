import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { corsHeaders } from './cors.ts'

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')!

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'employee'

export interface AuthContext {
  /** Auth0 sub — equals auth.uid() in RLS policies */
  userId: string
  /** Local organisation UUID — use in every query for tenant isolation */
  organisationId: string
  /** Auth0 org_id claim from the JWT (e.g. "org_abc123"), null if absent */
  auth0OrgId: string | null
  /** The caller's role from user_roles */
  role: AppRole
  /**
   * Service-role client — bypasses RLS.
   * ALWAYS add .eq('organisation_id', ctx.organisationId) to every query
   * so tenant isolation is enforced in application code.
   */
  adminClient: SupabaseClient
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Decode the payload section of a JWT without re-verifying the signature.
 * Supabase auth.getUser() has already validated the token; this is just
 * a cheap base64 decode to read the org_id claim.
 */

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve the authenticated request into a typed AuthContext.
 *
 * Steps:
 *  1. Validate Bearer header
 *  2. Verify JWT signature + expiry via Supabase auth.getUser()
 *  3. Extract Auth0 org_id claim from the (already-verified) payload
 *  4. Resolve local organisation UUID:
 *       fast path — JWT carries org_id → lookup by organisations.auth0_org_id
 *       slow path — fallback to profiles.organisation_id (pre-org-claim tokens)
 *  5. Resolve the caller's role from user_roles
 *
 * Throws a Response on any auth / authz failure so callers can return it:
 *   const ctx = await resolveAuthContext(req).catch((r) => r)
 *   if (ctx instanceof Response) return ctx
 */
export async function resolveAuthContext(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw jsonError('Missing or invalid authorization header', 401)
  }
  const token = authHeader.slice(7)

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  // Step 1 — Verify JWT (signature, expiry, audience)
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) throw jsonError('Unauthorized', 401)

  // Step 2 — Extract Auth0 org_id from the verified JWT payload (no extra RTT)
  const payload = decodeJwtPayload(token)
  const auth0OrgId = (payload['org_id'] as string | undefined) ?? null

  // Step 3 — Resolve organisation UUID (parallel where possible)
  let organisationId: string | null = null

  if (auth0OrgId) {
    // Fast path: JWT carries the Auth0 org_id — direct DB lookup
    const { data: org } = await adminClient
      .from('organisations')
      .select('id')
      .eq('auth0_org_id', auth0OrgId)
      .single()
    organisationId = org?.id ?? null
  }

  if (!organisationId) {
    // Slow path: covers tokens issued before org_id claim was added
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()
    organisationId = profile?.organisation_id ?? null
  }

  if (!organisationId) {
    throw jsonError('User has no organisation. Complete onboarding first.', 403)
  }

  // Step 4 — Resolve caller role
  const { data: roleRow } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  const role: AppRole = (roleRow?.role as AppRole) ?? 'employee'

  return { userId: user.id, organisationId, auth0OrgId, role, adminClient }
}

/**
 * Assert the caller has one of the required roles.
 * Throws a 403 Response if not satisfied — callers should `return` it:
 *
 *   requireRole(ctx, 'admin', 'manager')
 */
export function requireRole(ctx: AuthContext, ...allowed: AppRole[]): void {
  if (!allowed.includes(ctx.role)) {
    throw jsonError(`Forbidden: ${allowed.join(' or ')} role required`, 403)
  }
}

import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Request } from 'express'
import { getPool } from './db.js' // Imports your Supavisor transaction pool

export interface AuthContext {
  /** Auth0 subject claim — e.g. "auth0|64abc..." */
  auth0UserId: string
  /** Auth0 org_id claim embedded in the JWT after org-scoped login */
  auth0TenantId: string

  /** The local Postgres UUID for the user (from public.users) */
  localUserId: string
  /** The local Postgres UUID for the tenant (from public.tenants) */
  localTenantId: string
}

/**
 * Cryptographically verifies an Auth0 JWT from the Authorization header
 * AND resolves the associated local database UUIDs for RLS context.
 *
 * Returns null on any failure so callers can return 401 cleanly.
 */
export async function verifyAuth0Token(req: Request): Promise<AuthContext | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice(7)

  try {
    const domain = process.env.AUTH0_DOMAIN
    const audience = process.env.AUTH0_AUDIENCE
    if (!domain || !audience) throw new Error('AUTH0_DOMAIN / AUTH0_AUDIENCE not configured')

    // 1. Verify the JWT cryptographically
    const jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`))
    const { payload } = await jwtVerify(token, jwks, {
      audience,
      issuer: `https://${domain}/`,
    })

    const auth0UserId = payload.sub
    // Extract Auth0's internal org_id, but we will treat it as our Tenant ID
    const auth0TenantId = (payload as Record<string, unknown>)['org_id'] as string | undefined

    if (!auth0UserId || !auth0TenantId) {
      console.error('JWT missing required Auth0 user or organization claims.')
      return null
    }

    // 2. Resolve local Database UUIDs via the Supabase connection pool
    const pool = getPool()

    // We use subqueries here to fetch both UUIDs in a single fast network round-trip.
    const dbResult = await pool.query(
      `SELECT 
         (SELECT id FROM public.users WHERE auth0_user_id = $1) AS local_user_id,
         (SELECT id FROM public.tenants WHERE auth0_org_id = $2) AS local_tenant_id`,
      [auth0UserId, auth0TenantId]
    )

    const { local_user_id, local_tenant_id } = dbResult.rows[0]

    // If the Auth0 user or tenant isn't found in your local DB, reject the request.
    // This prevents desync issues from accessing data.
    if (!local_user_id || !local_tenant_id) {
      console.error('Security context mismatch: Auth0 IDs not found in local Postgres database.')
      return null
    }

    // 3. Return the fully hydrated context
    return {
      auth0UserId,
      auth0TenantId,
      localUserId: local_user_id,
      localTenantId: local_tenant_id,
    }
  } catch (error) {
    console.error('Authentication verification failed:', error)
    return null
  }
}

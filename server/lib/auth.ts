import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Request } from 'express'

export interface AuthContext {
  /** Auth0 subject claim — e.g. "auth0|64abc..." */
  auth0UserId: string
  /** Auth0 org_id claim embedded in the JWT after org-scoped login */
  auth0OrgId: string
}

/**
 * Cryptographically verifies an Auth0 JWT from the Authorization header.
 *
 * - Fetches the JWKS from the Auth0 tenant (cached after first fetch by jose).
 * - Validates audience and issuer.
 * - Extracts the `sub` (user) and `org_id` (organisation) claims.
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

    // createRemoteJWKSet caches the key set in memory after the first network fetch
    const jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`))

    const { payload } = await jwtVerify(token, jwks, {
      audience,
      issuer: `https://${domain}/`,
    })

    const auth0UserId = payload.sub
    // org_id is a custom claim added by Auth0 when the token is issued
    // inside an organisation-scoped login
    const auth0OrgId = (payload as Record<string, unknown>)['org_id'] as string | undefined

    if (!auth0UserId || !auth0OrgId) return null

    return { auth0UserId, auth0OrgId }
  } catch {
    return null
  }
}

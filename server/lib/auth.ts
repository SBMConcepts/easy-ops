// Auth0 access-token verification for the Express API.
//

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export const AUTH0_CLAIM_NS = 'https://easyops.us.auth0.com/'

/** Claims carried by a verified Auth0 ID/access token, with namespaced custom claims hoisted to top level. */
export interface Auth0Claims extends JWTPayload {
  sub: string
  email?: string
  /** Auth0 organization id (text). Sourced from the auth0_org_id/org_id custom claim. */
  org_id?: string
  /** Same value as org_id — the Post-Login Action namespaces it as auth0_org_id. */
  auth0_org_id?: string
  /** Access-tier role custom claim, if injected by the Post-Login Action. */
  role?: string
}

function getIssuer(): string {
  const domain = process.env.AUTH0_DOMAIN
  if (!domain) throw new Error('Missing AUTH0_DOMAIN environment variable.')
  // Accept a bare domain or a full URL; normalise to a trailing-slash issuer.
  const host = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://${host}/`
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | undefined
function getJwks() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`${getIssuer()}.well-known/jwks.json`))
  }
  return _jwks
}

/**
 * Verify an Auth0 access token and return its claims with namespaced custom
 * claims (org_id, role) hoisted to top-level convenience fields.
 *
 * Throws if the token is missing, malformed, expired, or fails verification.
 */
export async function verifyAuth0Token(token: string): Promise<Auth0Claims> {
  const audience = process.env.AUTH0_AUDIENCE
  if (!audience) throw new Error('Missing AUTH0_AUDIENCE environment variable.')

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: getIssuer(),
    audience,
  })

  // The Post-Login Action namespaces the org id as auth0_org_id, not org_id.
  const orgId =
    (payload[`${AUTH0_CLAIM_NS}auth0_org_id`] as string | undefined) ??
    (payload[`${AUTH0_CLAIM_NS}org_id`] as string | undefined) ??
    (payload['auth0_org_id'] as string | undefined) ??
    (payload['org_id'] as string | undefined)

  const role =
    (payload[`${AUTH0_CLAIM_NS}role`] as string | undefined) ??
    (payload['role'] as string | undefined)

  return {
    ...payload,
    sub: payload.sub as string,
    email: payload['email'] as string | undefined,
    org_id: orgId,
    auth0_org_id: orgId,
    role,
  }
}

/** Extract a Bearer token from an Authorization header value. */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1] : null
}

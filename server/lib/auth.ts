// Auth0 access-token verification for the Express API.
//
// Tokens are RS256 JWTs issued by Auth0. We verify the signature against the
// tenant JWKS and validate audience + issuer. Custom claims (org_id, role) are
// namespaced; the namespace must match the Auth0 Post-Login Action and the
// database `org_id()` function (see supabase migration).
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

// Namespace for custom claims. MUST match:
//   - auth0/actions/post-login.js  (CLAIM_NS)
//   - public.org_id() in the DB     (reads '<ns>org_id')
//   - src/lib/auth0-config.ts        (AUTH0_CLAIM_NS)
export const AUTH0_CLAIM_NS = 'https://easyops.us.auth0.com/'

export interface Auth0Claims extends JWTPayload {
  sub: string
  email?: string
  /** Auth0 organization id (text). Sourced from the org_id custom claim. */
  org_id?: string
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

  const orgId =
    (payload[`${AUTH0_CLAIM_NS}org_id`] as string | undefined) ??
    (payload['org_id'] as string | undefined)

  const role =
    (payload[`${AUTH0_CLAIM_NS}role`] as string | undefined) ??
    (payload['role'] as string | undefined)

  return {
    ...payload,
    sub: payload.sub as string,
    email: payload['email'] as string | undefined,
    org_id: orgId,
    role,
  }
}

/** Extract a Bearer token from an Authorization header value. */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1] : null
}

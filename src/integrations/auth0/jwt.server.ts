// JWKS-backed Auth0 access token verification. Server-only.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function jwks() {
  const url = process.env.AUTH0_JWKS_URL
  if (!url) throw new Error('AUTH0_JWKS_URL is not set')
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(url))
  return _jwks
}

export interface Auth0Claims extends JWTPayload {
  sub: string
  email?: string
  name?: string
  picture?: string
  org_id?: string
  permissions?: string[]
  'https://easy-ops-za.vercel.app/roles'?: string[]
  'https://easy-ops-za.vercel.app/tenant_id'?: string
}

export async function verifyAuth0Token(token: string): Promise<Auth0Claims> {
  const issuer = process.env.AUTH0_ISSUER
  const audience = process.env.AUTH0_AUDIENCE
  if (!issuer) throw new Error('AUTH0_ISSUER is not set')
  const { payload } = await jwtVerify(token, jwks(), {
    issuer,
    audience: audience || undefined,
  })
  return payload as Auth0Claims
}

export function extractBearer(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null
  const m = /^Bearer\s+(.+)$/i.exec(headerValue.trim())
  return m ? m[1] : null
}

import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Request } from 'express'
import type { Database } from '../types/supabase.js'

export type AppRole = Database['public']['Enums']['tenant_role']

export interface AuthContext {
  auth0UserId: string
  orgId: string
  role: AppRole
  permissions: string[]
  email?: string
  name?: string
  picture?: string
}

const CLAIM_NAMESPACE = process.env.AUTH0_CLAIM_NS ?? 'https://easy-ops-za.vercel.app/'

// OAuth/OIDC endpoints derived from the Auth0 tenant domain
// (https://easy-ops.us.auth0.com/.well-known/openid-configuration):
//   issuer    → https://${AUTH0_DOMAIN}/
//   jwks_uri  → https://${AUTH0_DOMAIN}/.well-known/jwks.json
//
// The remote JWKS is fetched once and cached on this set instance. jose reuses
// the cached signing keys (with a built-in refresh cooldown) across all token
// verifications, so we must memoise the set rather than recreate it per request
// — otherwise every verification re-hits the JWKS endpoint. Cached by domain so
// a config change is picked up without a process restart.
let jwksDomain: string | null = null
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks(domain: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks || jwksDomain !== domain) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`))
    jwksDomain = domain
  }
  return jwks
}

export async function verifyAuth0Token(req: Request): Promise<AuthContext | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice(7)

  try {
    const domain = process.env.AUTH0_DOMAIN
    const audience = process.env.AUTH0_AUDIENCE
    if (!domain || !audience) throw new Error('AUTH0_DOMAIN / AUTH0_AUDIENCE not configured')

    const { payload } = await jwtVerify(token, getJwks(domain), {
      audience,
      issuer: `https://${domain}/`,
    })

    const auth0UserId = payload.sub
    const orgId = payload[`${CLAIM_NAMESPACE}org_id`] as string
    const role = payload[`${CLAIM_NAMESPACE}role`] as AppRole
    // Permissions may arrive two ways: the namespaced custom claim injected by
    // the post-login Action (DB role_permissions is the source of truth), and/or
    // Auth0 native RBAC's top-level `permissions` array. Merge + de-dupe both so
    // either propagation path works.
    const nsPermissions = payload[`${CLAIM_NAMESPACE}permissions`]
    const permissions = Array.from(
      new Set([
        ...(Array.isArray(nsPermissions) ? (nsPermissions as string[]) : []),
        ...(Array.isArray(payload.permissions) ? (payload.permissions as string[]) : []),
      ])
    )
    const email =
      (payload.email as string) ?? (payload[`${CLAIM_NAMESPACE}email`] as string) ?? undefined
    const name =
      (payload.name as string) ?? (payload[`${CLAIM_NAMESPACE}name`] as string) ?? undefined
    const picture =
      (payload.picture as string) ?? (payload[`${CLAIM_NAMESPACE}picture`] as string) ?? undefined

    if (!auth0UserId) return null

    return {
      auth0UserId,
      orgId: orgId || '',
      role: role,
      permissions,
      email,
      name,
      picture,
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

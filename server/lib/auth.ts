import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Request } from 'express'
import type { Database } from '../types/supabase.js'

// Strictly matches your Postgres database enum
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

let jwksDomain: string | null = null
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks(domain: string): ReturnType<typeof createRemoteJWKSet> {
  if (domain !== jwksDomain || !jwks) {
    jwksDomain = domain
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`))
  }
  return jwks
}

export async function verifyAuth0Token(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  const domain = process.env.AUTH0_DOMAIN
  const audience = process.env.AUTH0_AUDIENCE

  if (!domain || !audience) {
    console.error('Missing AUTH0_DOMAIN or AUTH0_AUDIENCE in environment variables')
    return null
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(domain), {
      audience,
      issuer: `https://${domain}/`,
    })

    const auth0UserId = payload.sub

    // Safely extract orgId checking both top-level and custom namespace injections
    const orgId = (payload.org_id as string) || (payload[`${CLAIM_NAMESPACE}org_id`] as string)

    // Safely cast role, falling back to 'employee' if missing
    const role = (payload[`${CLAIM_NAMESPACE}role`] as AppRole) || 'employee'

    // Merge Auth0 Native RBAC permissions and Namespaced Custom Permissions
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
      role,
      permissions,
      email,
      name,
      picture,
    }
  } catch (err) {
    console.error('Token verification failed:', err)
    return null
  }
}

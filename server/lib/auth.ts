import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Request } from 'express'

export interface AuthContext {
  auth0UserId: string
  orgId: string
  role: 'admin' | 'manager' | 'supervisor' | 'employee'
}

// Ensure this matches the exact namespace from your Auth0 Action
const CLAIM_NAMESPACE = 'https://easy-ops-za.vercel.app/'

export async function verifyAuth0Token(req: Request): Promise<AuthContext | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice(7)

  try {
    const domain = process.env.AUTH0_DOMAIN
    const audience = process.env.AUTH0_AUDIENCE
    if (!domain || !audience) throw new Error('AUTH0_DOMAIN / AUTH0_AUDIENCE not configured')

    const jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`))
    const { payload } = await jwtVerify(token, jwks, { audience, issuer: `https://${domain}/` })

    // Extract the immutable native Auth0 Subject
    const auth0UserId = payload.sub

    // Extract the injected multitenant claims
    const orgId = payload[`${CLAIM_NAMESPACE}org_id`] as string | undefined
    const role = payload[`${CLAIM_NAMESPACE}role`] as AuthContext['role'] | undefined

    if (!auth0UserId) {
      console.error('JWT verification failed: Missing required subject claim.')
      return null
    }

    // Return the clean, stateless context
    return {
      auth0UserId,
      orgId: orgId || '', // Allows empty string if accessing a public/creation route
      role: role || 'employee',
    }
  } catch (error) {
    console.error('Token cryptographic verification failed:', error)
    return null
  }
}

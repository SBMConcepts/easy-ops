import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Request } from 'express'
import type { Database } from '../types/supabase.js'

export type AppRole = Database['public']['Enums']['tenant_role']

export interface AuthContext {
  auth0UserId: string
  orgId: string
  role: AppRole
}

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

    const auth0UserId = payload.sub
    const orgId = payload[`${CLAIM_NAMESPACE}org_id`] as string | undefined
    const role = payload[`${CLAIM_NAMESPACE}role`] as AppRole | undefined

    if (!auth0UserId) return null

    return {
      auth0UserId,
      orgId: orgId || '',
      role: role || 'employee',
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

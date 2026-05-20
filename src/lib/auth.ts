import { NextRequest } from 'next/server'
import * as jose from 'jose'

const JWKS = jose.createRemoteJWKSet(
  new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
)

export interface AuthenticatedContext {
  auth0UserId: string
  auth0OrgId: string
}

export async function verifyAuth0Token(req: NextRequest): Promise<AuthenticatedContext | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]

  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      audience: process.env.AUTH0_AUDIENCE,
    })

    if (!payload.sub || !payload.org_id) return null

    return {
      auth0UserId: payload.sub,
      auth0OrgId: payload.org_id as string,
    }
  } catch (error) {
    console.error('JWT cryptographic validation failed:', error)
    return null
  }
}

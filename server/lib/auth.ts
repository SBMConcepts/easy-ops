import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Request } from 'express'
import { getPool } from './db.js'

export interface AuthContext {
  auth0UserId: string
  auth0TenantId: string
  localUserId: string
  localTenantId: string
  role: 'admin' | 'manager' | 'supervisor' | 'employee' // <-- Added Role
}

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
    const auth0TenantId = (payload as Record<string, unknown>)['org_id'] as string | undefined

    if (!auth0UserId || !auth0TenantId) {
      console.error('JWT missing required Auth0 user or organization claims.')
      return null
    }

    const pool = getPool()

    // NEW: Fetch local_user_id, local_tenant_id, AND the user's role in one fast query
    const dbResult = await pool.query(
      `SELECT 
         (SELECT id FROM public.users WHERE auth0_user_id = $1) AS local_user_id,
         (SELECT id FROM public.tenants WHERE auth0_org_id = $2) AS local_tenant_id,
         (
           SELECT role FROM public.tenant_memberships tm
           JOIN public.users u ON tm.user_id = u.id
           JOIN public.tenants t ON tm.tenant_id = t.id
           WHERE u.auth0_user_id = $1 AND t.auth0_org_id = $2
           LIMIT 1
         ) AS local_role`,
      [auth0UserId, auth0TenantId]
    )

    const { local_user_id, local_tenant_id, local_role } = dbResult.rows[0]

    if (!local_user_id || !local_tenant_id || !local_role) {
      console.error('Security context mismatch: Auth0 IDs not found in local Postgres database.')
      return null
    }

    return {
      auth0UserId,
      auth0TenantId,
      localUserId: local_user_id,
      localTenantId: local_tenant_id,
      role: local_role, // <-- Now attached to the verified context
    }
  } catch (err) {
    console.error('JWT Verification failed:', err)
    return null
  }
}

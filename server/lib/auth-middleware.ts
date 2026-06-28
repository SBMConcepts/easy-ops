// Express middleware for Auth0 authentication and org/role gating.
//
// - requireAuth: reads the server-side OIDC session (express-openid-connect),
//   attaches `req.auth` from the session's ID-token claims.
// - requireOrg: ensures an org_id claim is present, attaches `req.orgId`.
// - requireRole: ensures the caller's membership in the current org meets a
//   minimum access tier (owner > admin > member > viewer).
//
// All routes scope their data access by `req.orgId`; tenancy is enforced in
// code (the service-role Supabase client bypasses RLS).
//
// The app is a confidential (Regular Web App) client: the Express backend runs
// the OAuth code exchange and holds the session in an encrypted cookie. The
// browser never sees Auth0 tokens, so there is no Bearer token to verify here.
import type { NextFunction, Request, Response } from 'express'

import { AUTH0_CLAIM_NS, type Auth0Claims } from './auth.js'
import { supabaseAdmin } from './supabase-admin.js'
import { hasRequiredRole, type AccessRole } from './rbac.js'

export interface AuthedRequest extends Request {
  auth?: Auth0Claims
  orgId?: string
  /** Lazily resolved org_members.role for req.auth.sub in req.orgId. */
  memberRole?: string | null
}

/** Require an authenticated OIDC session and attach hoisted claims to req.auth. */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const oidc = req.oidc
  if (!oidc || !oidc.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated.' })
    return
  }

  // The Post-Login Action injects namespaced custom claims (org_id, role) into
  // the ID token; express-openid-connect persists those in the session.
  const claims = (oidc.idTokenClaims ?? oidc.user ?? {}) as Record<string, unknown>
  const orgId =
    (claims[`${AUTH0_CLAIM_NS}org_id`] as string | undefined) ??
    (claims['org_id'] as string | undefined)
  const role =
    (claims[`${AUTH0_CLAIM_NS}role`] as string | undefined) ??
    (claims['role'] as string | undefined)

  req.auth = {
    ...(claims as Auth0Claims),
    sub: (oidc.user?.sub ?? claims['sub']) as string,
    email: (oidc.user?.email ?? claims['email']) as string | undefined,
    org_id: orgId,
    role,
  }
  next()
}

/** Require that the verified token carries an org_id claim. */
export function requireOrg(req: AuthedRequest, res: Response, next: NextFunction): void {
  const orgId = req.auth?.org_id
  if (!orgId) {
    res.status(403).json({ error: 'No organization context on this session.' })
    return
  }
  req.orgId = orgId
  next()
}

/**
 * Resolve the caller's access tier within `req.orgId` from the database and
 * cache it on the request. Returns null if the user has no active membership.
 */
async function resolveMemberRole(req: AuthedRequest): Promise<string | null> {
  if (req.memberRole !== undefined) return req.memberRole
  const sub = req.auth?.sub
  const orgId = req.orgId ?? req.auth?.org_id
  if (!sub || !orgId) {
    req.memberRole = null
    return null
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth0_user_id', sub)
    .maybeSingle()

  if (!user) {
    req.memberRole = null
    return null
  }

  const { data: member } = await supabaseAdmin
    .from('org_members')
    .select('role, status')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  const role = member && member.status === 'active' ? member.role : null
  req.memberRole = role
  return role
}

/** Require a minimum access tier in the current org. */
export function requireRole(minRole: AccessRole) {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await resolveMemberRole(req)
      if (!hasRequiredRole(role, minRole)) {
        res.status(403).json({ error: `Requires '${minRole}' access or higher.` })
        return
      }
      next()
    } catch {
      res.status(500).json({ error: 'Failed to verify membership role.' })
    }
  }
}

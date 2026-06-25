// Express middleware for Auth0 authentication and org/role gating.
//
// - requireAuth: verifies the Bearer access token, attaches `req.auth`.
// - requireOrg: ensures an org_id claim is present, attaches `req.orgId`.
// - requireRole: ensures the caller's membership in the current org meets a
//   minimum access tier (owner > admin > member > viewer).
//
// All routes scope their data access by `req.orgId`; tenancy is enforced in
// code (the service-role Supabase client bypasses RLS).
import type { NextFunction, Request, Response } from 'express'

import { extractBearerToken, verifyAuth0Token, type Auth0Claims } from './auth.js'
import { supabaseAdmin } from './supabase-admin.js'
import { hasRequiredRole, type AccessRole } from './rbac.js'

export interface AuthedRequest extends Request {
  auth?: Auth0Claims
  orgId?: string
  /** Lazily resolved org_members.role for req.auth.sub in req.orgId. */
  memberRole?: string | null
}

/** Verify the Auth0 access token and attach claims to the request. */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization bearer token.' })
    return
  }
  try {
    req.auth = await verifyAuth0Token(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token.' })
  }
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

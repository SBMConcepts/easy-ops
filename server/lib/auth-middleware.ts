// Express middleware for Auth0 authentication and org/role gating.
//
// - requireAuth: reads the server-side OIDC session (express-openid-connect),
//   attaches `req.auth` from the session's ID-token claims.
// - requireOrg: ensures an org_id claim is present, attaches `req.orgId`.
// - requireRole: ensures the caller's membership in the current org meets a
//   minimum access tier (owner > admin > manager > member).
//
// All routes scope their data access by `req.orgId`; tenancy is enforced in
// code (the service-role Supabase client bypasses RLS).
//
// The app is a confidential (Regular Web App) client: the Express backend runs
// the OAuth code exchange and holds the session in an encrypted cookie. The
// browser never sees Auth0 tokens, so there is no Bearer token to verify here.
import type { NextFunction, Request, Response } from 'express'

import { AUTH0_CLAIM_NS, type Auth0Claims } from './auth.js'
import { hasRequiredRole, type AccessRole } from './rbac.js'
import { roleHasPermission, type Permission } from './permissions.js'
import { findActiveOrgMember } from './org-members.js'
import { supabaseAdmin } from './supabase-admin.js'

/** An Express request augmented with the verified Auth0 claims and resolved org/role context. */
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

  // The Post-Login Action injects namespaced custom claims (auth0_org_id, role)
  // into the ID token; express-openid-connect persists those in the session.
  const claims = (oidc.idTokenClaims ?? oidc.user ?? {}) as Record<string, unknown>
  const orgId =
    (claims[`${AUTH0_CLAIM_NS}auth0_org_id`] as string | undefined) ??
    (claims[`${AUTH0_CLAIM_NS}org_id`] as string | undefined) ??
    (claims['auth0_org_id'] as string | undefined) ??
    (claims['org_id'] as string | undefined)
  const role =
    (claims[`${AUTH0_CLAIM_NS}role`] as string | undefined) ??
    (claims['role'] as string | undefined)

  req.auth = {
    ...(claims as Auth0Claims),
    sub: (oidc.user?.sub ?? claims['sub']) as string,
    email: (oidc.user?.email ?? claims['email']) as string | undefined,
    org_id: orgId,
    auth0_org_id: orgId,
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

  const member = await findActiveOrgMember(orgId, sub)
  const role = member?.role ?? null
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

/**
 * Require that the caller's role grants a specific `resource:action` scope in
 * the current org. Scopes are derived from the DB-authoritative role via
 * ROLE_PERMISSIONS, so this agrees with the Supabase RLS policies.
 */
export function requirePermission(permission: Permission) {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await resolveMemberRole(req)
      if (!roleHasPermission(role, permission)) {
        res.status(403).json({ error: `Requires '${permission}' permission.` })
        return
      }
      next()
    } catch {
      res.status(500).json({ error: 'Failed to verify permission.' })
    }
  }
}

/** Require that the caller holds at least one of the given scopes. */
export function requireAnyPermission(...permissions: Permission[]) {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await resolveMemberRole(req)
      if (!permissions.some((p) => roleHasPermission(role, p))) {
        res.status(403).json({ error: `Requires one of: ${permissions.join(', ')}.` })
        return
      }
      next()
    } catch {
      res.status(500).json({ error: 'Failed to verify permission.' })
    }
  }
}

/** Require that the caller holds every one of the given scopes. */
export function requireAllPermissions(...permissions: Permission[]) {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await resolveMemberRole(req)
      if (!permissions.every((p) => roleHasPermission(role, p))) {
        res.status(403).json({ error: `Requires all of: ${permissions.join(', ')}.` })
        return
      }
      next()
    } catch {
      res.status(500).json({ error: 'Failed to verify permission.' })
    }
  }
}

/**
 * Require a current billing entitlement for operational APIs. Billing, profile,
 * session, and onboarding endpoints are intentionally mounted before this
 * middleware so an administrator can recover a restricted organization.
 */
export async function requireOperationalAccess(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.oidc?.isAuthenticated()) {
      res.status(401).json({ error: 'Not authenticated.' })
      return
    }

    const claims = (req.oidc.idTokenClaims ?? req.oidc.user ?? {}) as Record<string, unknown>
    const orgId =
      (claims[`${AUTH0_CLAIM_NS}auth0_org_id`] as string | undefined) ??
      (claims[`${AUTH0_CLAIM_NS}org_id`] as string | undefined) ??
      (claims.auth0_org_id as string | undefined) ??
      (claims.org_id as string | undefined)
    if (!orgId) {
      res.status(403).json({ error: 'No organization context on this session.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('billing_state, access_ends_at')
      .eq('auth0_org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error

    // Trials and unpaid states lapse at access_ends_at; only a paid (or in-grace) subscription is open-ended.
    const accessEndsAt = data?.access_ends_at ? new Date(data.access_ends_at).getTime() : null
    const hasAccess =
      data?.billing_state === 'active' ||
      data?.billing_state === 'past_due' ||
      (data?.billing_state === 'trial' && accessEndsAt === null) ||
      (accessEndsAt !== null && accessEndsAt > Date.now())
    if (!hasAccess) {
      res.status(402).json({
        error: 'An active subscription is required to use operational features.',
        code: 'billing_required',
      })
      return
    }
    next()
  } catch {
    res.status(500).json({ error: 'Failed to verify subscription access.' })
  }
}

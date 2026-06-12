import type { Request, Response, NextFunction } from 'express'
import { verifyAuth0Token, type AuthContext, type AppRole } from './auth.js'
import { hasRequiredRole } from './rbac.js'

// Express Request augmented with the verified Auth0 context. Routes mounted
// behind requireAuth0Auth can read `req.auth` without re-verifying the token.
export interface AuthenticatedRequest extends Request {
  auth?: AuthContext
}

// Verifies the incoming Auth0 access token (delegating to verifyAuth0Token, the
// single source of truth) and attaches the resulting AuthContext to req.auth.
// Responds 401 when the token is missing or invalid.
export async function requireAuth0Auth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authCtx = await verifyAuth0Token(req)
  if (!authCtx) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }
  req.auth = authCtx
  next()
}

// Like requireAuth0Auth, but additionally requires an organization context.
// Use for endpoints that operate strictly within a tenant.
export async function requireAuth0Org(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authCtx = await verifyAuth0Token(req)
  if (!authCtx || !authCtx.orgId) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }
  req.auth = authCtx
  next()
}

// Middleware factory enforcing a minimum role. Must run after requireAuth0Auth
// (or requireAuth0Org) so req.auth is populated; responds 403 when the caller's
// role is below the threshold.
export function requireRole(minimumRole: AppRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized.' })
      return
    }
    if (!hasRequiredRole(req.auth, minimumRole)) {
      res.status(403).json({ error: 'Forbidden.' })
      return
    }
    next()
  }
}

// Middleware factory enforcing a specific Auth0 RBAC permission (e.g.
// 'read:members'). Must run after requireAuth0Auth so req.auth is populated;
// responds 403 when the caller's access token lacks the permission.
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized.' })
      return
    }
    if (!req.auth.permissions.includes(permission)) {
      res.status(403).json({ error: `Forbidden: missing permission ${permission}` })
      return
    }
    next()
  }
}

// Middleware factory passing when the caller holds AT LEAST ONE of the listed
// permissions. Use for endpoints reachable by several distinct capabilities.
export function requireAnyPermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized.' })
      return
    }
    if (!permissions.some((p) => req.auth!.permissions.includes(p))) {
      res.status(403).json({ error: `Forbidden: requires one of ${permissions.join(', ')}` })
      return
    }
    next()
  }
}

// Middleware factory requiring the caller to hold EVERY listed permission.
export function requireAllPermissions(...permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized.' })
      return
    }
    const missing = permissions.filter((p) => !req.auth!.permissions.includes(p))
    if (missing.length > 0) {
      res.status(403).json({ error: `Forbidden: missing permission(s) ${missing.join(', ')}` })
      return
    }
    next()
  }
}

// Server-side Auth0 guards for Next.js App Router route handlers (and server
// actions). Verifies the bearer token via JWKS and exposes a typed context.
// Wrap a route handler with `withAuth` for authentication, `withPermission(...)`
// for RBAC, or `withOrg` to require an active organization. Inside server
// actions/components, call `requireAuth0Auth(request)` directly.
import { NextResponse, type NextRequest } from 'next/server'
import { extractBearer, verifyAuth0Token, type Auth0Claims } from './jwt.server'

export interface Auth0Context {
  token: string
  claims: Auth0Claims
  userId: string // Auth0 sub
  email: string | undefined
  orgId: string | undefined // Auth0 organization id (org_xxx)
  permissions: string[]
  roles: string[]
}

// Thrown by the guards below; carries the HTTP status to return to the client.
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = 'AuthError'
  }
}

// Verifies the request's bearer token and returns the Auth0 context, or null
// when the token is missing or invalid.
export async function getAuth0Context(req: Request): Promise<Auth0Context | null> {
  const token = extractBearer(req.headers.get('authorization'))
  if (!token) return null
  let claims: Auth0Claims
  try {
    claims = await verifyAuth0Token(token)
  } catch (err) {
    console.warn('Auth0 token verification failed', err)
    return null
  }
  if (!claims.sub) return null
  return {
    token,
    claims,
    userId: claims.sub,
    email: claims.email,
    orgId: claims.org_id,
    permissions: Array.isArray(claims.permissions) ? claims.permissions : [],
    roles: Array.isArray(claims['https://easy-ops-za.vercel.app/roles'])
      ? (claims['https://easy-ops-za.vercel.app/roles'] as string[])
      : [],
  }
}

// Like getAuth0Context, but throws AuthError(401) when unauthenticated. Use
// inside server actions/components where you handle the error yourself.
export async function requireAuth0Auth(req: Request): Promise<Auth0Context> {
  const context = await getAuth0Context(req)
  if (!context) throw new AuthError('Unauthorized: missing or invalid token', 401)
  return context
}

// Second argument passed by Next.js to route handlers (dynamic segment params).
type RouteSegment = { params: Promise<Record<string, string | string[]>> }

type AuthedRouteHandler = (
  req: NextRequest,
  context: Auth0Context,
  segment: RouteSegment
) => Response | Promise<Response>

function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  throw err
}

// Wraps a Next.js route handler, injecting the verified Auth0 context as the
// second argument and returning 401 when authentication fails.
export function withAuth(handler: AuthedRouteHandler) {
  return async (req: NextRequest, segment: RouteSegment): Promise<Response> => {
    try {
      const context = await requireAuth0Auth(req)
      return await handler(req, context, segment)
    } catch (err) {
      return toErrorResponse(err)
    }
  }
}

// Wraps a route handler, requiring the caller to hold a specific permission;
// returns 403 when the permission is absent.
export function withPermission(permission: string, handler: AuthedRouteHandler) {
  return withAuth(async (req, context, segment) => {
    if (!context.permissions.includes(permission)) {
      throw new AuthError(`Forbidden: missing permission ${permission}`, 403)
    }
    return handler(req, context, segment)
  })
}

// Wraps a route handler, requiring an active organization in the token;
// returns 403 when no org is present.
export function withOrg(handler: AuthedRouteHandler) {
  return withAuth(async (req, context, segment) => {
    if (!context.orgId) {
      throw new AuthError(
        'Forbidden: no active organization in token (select or create a tenant)',
        403
      )
    }
    return handler(req, context, segment)
  })
}

// Client hook: derives permission/role helpers from the live Auth0 ID token
// claims exposed by @auth0/auth0-react. Permissions come from the API
// access token via a namespace claim populated by the Auth0 Login Action
// (mirror of `permissions` in the access token).
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState } from 'react'
import { decodeJwt } from 'jose'
import { getAuth0AccessToken, subscribeAuth0Token } from '../../integrations/auth0/token-store'
import type { Permission } from './permissions'

interface DecodedAccessToken {
  sub?: string
  org_id?: string
  permissions?: string[]
  'https://easy-ops-za.vercel.app/roles'?: string[]
  'https://easy-ops-za.vercel.app/tenant_id'?: string
}

function decode(token: string | null): DecodedAccessToken {
  if (!token) return {}
  try {
    return decodeJwt(token) as DecodedAccessToken
  } catch {
    return {}
  }
}

export function useAuth() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0()
  const [token, setToken] = useState<string | null>(() => getAuth0AccessToken())

  useEffect(() => {
    const unsubscribe = subscribeAuth0Token(setToken)
    return () => {
      unsubscribe()
    }
  }, [])

  const claims = decode(token)
  const permissions = claims.permissions ?? []
  const roles = claims['https://easy-ops-za.vercel.app/roles'] ?? []
  const orgId = claims.org_id ?? null
  const tenantId = claims['https://easy-ops-za.vercel.app/tenant_id'] ?? null

  return {
    isAuthenticated,
    isLoading,
    user,
    token,
    orgId,
    tenantId,
    permissions,
    roles,
    hasPermission: (p: Permission) => permissions.includes(p),
    hasAnyPermission: (...ps: Permission[]) => ps.some((p) => permissions.includes(p)),
    hasRole: (r: string) => roles.includes(r),
    login: (opts?: { organization?: string; invitation?: string; screen_hint?: 'signup' }) =>
      loginWithRedirect({
        authorizationParams: {
          organization: opts?.organization,
          invitation: opts?.invitation,
          screen_hint: opts?.screen_hint,
        },
      }),
    logout: () =>
      logout({
        logoutParams: {
          returnTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      }),
  }
}

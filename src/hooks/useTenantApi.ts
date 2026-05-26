import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'

// Point to your Next.js/Express API Base URL
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api'

/**
 * Returns a stable, tenant-scoped fetch helper: apiFetch
 *
 * apiFetch(path, …) → fetch() to your Express Backend.
 *
 * It silently acquires the Auth0 access token and automatically injects:
 * 1. Authorization: Bearer <token>
 * 2. x-tenant-slug: <tenant.slug>
 *
 * Your Express middleware uses the slug and token to securely initialize
 * PostgreSQL Row-Level Security (RLS) for the transaction.
 */
export function useTenantApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const { tenant } = useTenant()

  const tenantSlug = tenant?.slug

  const apiFetch = useCallback(
    async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getAccessToken()

      const headers = new Headers(init.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      if (tenantSlug) headers.set('x-tenant-slug', tenantSlug)

      const response = await fetch(`/api/${path}`, {
        ...init,
        headers,
      })

      if (!response.ok) throw new Error(`Request failed: ${response.status}`)

      return response.json() as Promise<T>
    },
    [getAccessToken, tenantSlug]
  )

  return { apiFetch, isAuthenticated }
}

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

  const apiFetch = useCallback(
    async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getAccessToken()

      const headers = new Headers(init.headers)

      // Inject Identity Context
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      // Inject Workspace Context (Zero-Trust Cross-Check)
      if (tenant?.slug) {
        headers.set('x-tenant-slug', tenant.slug)
      }

      if (!headers.has('Content-Type') && init.method !== 'GET') {
        headers.set('Content-Type', 'application/json')
      }

      // Clean up path slashes to prevent malformed URLs
      const cleanPath = path.startsWith('/') ? path.slice(1) : path
      const response = await fetch(`${API_BASE_URL}/${cleanPath}`, { ...init, headers })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`[${response.status}] /${cleanPath}: ${errorText}`)
      }

      return response.json() as Promise<T>
    },
    [getAccessToken, tenant?.slug]
  )

  return { apiFetch, isAuthenticated }
}

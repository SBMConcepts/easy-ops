import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useTenantApi() {
  const { getAccessToken, tenant } = useAuth()

  const tenantSlug = tenant?.slug

  const apiFetch = useCallback(
    async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getAccessToken()

      const headers = new Headers(init.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      if (tenantSlug) headers.set('x-tenant-slug', tenantSlug)

      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/${path}`, {
        ...init,
        headers,
      })

      if (!response.ok) {
        // Try to return server-provided message
        let message = `Request failed: ${response.status}`
        try {
          const data = await response.json()
          message = data?.message ?? message
        } catch (_) {
          /* ignore JSON parsing errors */
        }
        throw new Error(message)
      }

      return (await response.json()) as T
    },
    [getAccessToken, tenantSlug]
  )

  return { apiFetch }
}

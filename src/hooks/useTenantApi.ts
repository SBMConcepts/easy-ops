import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext' // Or your chosen Auth0 / context wrapper

export function useTenantApi() {
  // Removed 'tenant' state extraction since multi-tenancy is native within the JWT
  const { getAccessToken } = useAuth()

  const apiFetch = useCallback(
    async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getAccessToken()

      const headers = new Headers(init.headers)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      headers.set('Content-Type', 'application/json') // Enforced standard

      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/${path}`, {
        ...init,
        headers,
      })

      if (!response.ok) {
        let message = `Request failed: ${response.status}`
        try {
          const data = await response.json()
          message = data?.error ?? data?.message ?? message
        } catch (_) {
          /* ignore JSON parsing errors */
        }
        throw new Error(message)
      }

      return (await response.json()) as T
    },
    [getAccessToken] // Removed tenantSlug dependency
  )

  return { apiFetch }
}

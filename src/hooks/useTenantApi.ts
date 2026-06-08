import { useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429
  }
}

interface ApiFetchOptions extends RequestInit {
  requireAuth?: boolean
}

export function useTenantApi() {
  const { getAccessTokenSilently } = useAuth0()
  const baseUrl = `${import.meta.env.VITE_API_URL}/api`

  const apiFetch = useCallback(
    async <T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
      const { requireAuth = true, headers, ...rest } = options
      const reqHeaders = new Headers(headers)

      if (!reqHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
        reqHeaders.set('Content-Type', 'application/json')
        reqHeaders.set('Accept', '*/*')
      }

      if (requireAuth) {
        try {
          const token = await getAccessTokenSilently()
          reqHeaders.set('Authorization', `Bearer ${token}`)
        } catch (err) {
          console.warn('Failed to attach Auth0 token to API request', err)
        }
      }

      const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, {
        ...rest,
        headers: reqHeaders,
      })

      if (response.status === 204) return null as T

      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`
        try {
          const body = await response.json()
          message = (body?.error ?? body?.message ?? message) as string
        } catch {
          /* Ignore JSON parsing errors */
        }
        throw new ApiError(response.status, message)
      }

      return (await response.json()) as T
    },
    [getAccessTokenSilently, baseUrl]
  )

  return { apiFetch }
}

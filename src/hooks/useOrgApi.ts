import { useCallback } from 'react'

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
  /** Retained for call-site compatibility. Auth now rides in the session
   * cookie, so this no longer toggles a Bearer header. */
  requireAuth?: boolean
}

export function useOrgApi() {
  const apiFetch = useCallback(
    async <T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
      const { requireAuth: _requireAuth = true, headers, ...rest } = options
      const reqHeaders = new Headers(headers)

      // Only declare a JSON content type when we actually send a body. Setting
      // Content-Type on a bodyless GET turns it into a non-simple request and
      // forces an unnecessary CORS preflight.
      if (rest.body && !(rest.body instanceof FormData) && !reqHeaders.has('Content-Type')) {
        reqHeaders.set('Content-Type', 'application/json')
      }

      // Fall back to a same-origin relative '/api' so the Vite dev proxy (and a
      // same-origin production deployment) work without VITE_API_URL being set.
      const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

      // `credentials: 'include'` sends the express-openid-connect session cookie
      // so the backend can authenticate the caller (Regular Web App flow).
      const response = await fetch(`${apiBase}/${path.replace(/^\//, '')}`, {
        ...rest,
        headers: reqHeaders,
        credentials: 'include',
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
    []
  )

  return { apiFetch }
}

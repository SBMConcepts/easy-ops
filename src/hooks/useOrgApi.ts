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

export function useOrgApi() {
  const { getAccessTokenSilently } = useAuth0()

  const attachAuth0Auth = useCallback(
    async (headers: Headers): Promise<Headers> => {
      // Do NOT swallow a token failure and continue: calling a protected
      // endpoint (e.g. /userinfo) without a Bearer token yields a 401 and an
      // opaque CORS/preflight-style failure in the browser. Surface it as a
      // clear, retry-aware ApiError so callers know auth is required first.
      let token: string
      try {
        token = await getAccessTokenSilently() // throws if no valid token is available
      } catch {
        throw new ApiError(401, '401 Not authenticated: no valid Auth0 access token available.')
      }
      headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
    [getAccessTokenSilently]
  )

  const apiFetch = useCallback(
    async <T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
      const { requireAuth = true, headers, ...rest } = options
      const reqHeaders = new Headers(headers)

      // Only declare a JSON content type when we actually send a body. Setting
      // Content-Type on a bodyless GET turns it into a non-simple request and
      // forces an unnecessary CORS preflight (which is what fails for /userinfo).
      if (rest.body && !(rest.body instanceof FormData) && !reqHeaders.has('Content-Type')) {
        reqHeaders.set('Content-Type', 'application/json')
      }

      const finalHeaders = requireAuth ? await attachAuth0Auth(reqHeaders) : reqHeaders

      // Fall back to a same-origin relative '/api' so the Vite dev proxy (and a
      // same-origin production deployment) work without VITE_API_URL being set.
      // An empty base would build '//userinfo', which the browser treats as a
      // protocol-relative URL and resolves to 'https://userinfo/'.
      const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

      const response = await fetch(`${apiBase}/${path.replace(/^\//, '')}`, {
        ...rest,
        headers: finalHeaders,
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
    [attachAuth0Auth]
  )

  return { apiFetch }
}

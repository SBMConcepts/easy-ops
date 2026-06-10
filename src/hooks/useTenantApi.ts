import { useCallback } from 'react'
import { useAttachAuth0Auth } from '../integrations/supabase/auth-attacher'

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
  const attachAuth0Auth = useAttachAuth0Auth()
  // Fall back to a same-origin relative '/api' so the Vite dev proxy (and a
  // same-origin production deployment) work without VITE_API_URL being set.
  const baseUrl = `${import.meta.env.VITE_API_URL}`.replace(/\/?$/, '/api')

  const apiFetch = useCallback(
    async <T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
      const { requireAuth = true, headers, ...rest } = options
      const reqHeaders = new Headers(headers)

      if (!reqHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
        reqHeaders.set('Content-Type', 'application/json')
        reqHeaders.set('Accept', '*/*')
      }

      const finalHeaders = requireAuth ? await attachAuth0Auth(reqHeaders) : reqHeaders

      const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, {
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
    [attachAuth0Auth, baseUrl]
  )

  return { apiFetch }
}

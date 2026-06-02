import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext' // Or your chosen Auth0 / context wrapper

// =============================================================================
// useTenantApi
//
// Central HTTP client for all calls to the Express API backend.
// Tenant context is carried exclusively by the Auth0 JWT (org_id claim) —
// no slug header, no tenant ID injected by the client. The backend resolves
// the caller's tenant via current_tenant_id() from the JWT automatically.
//
// Usage:
//   const { apiFetch } = useTenantApi()
//   const data = await apiFetch<MyType>('some/endpoint')
//   const result = await apiFetch<MyType>('resource/123', { method: 'DELETE' })
// =============================================================================

// ── Error class ──────────────────────────────────────────────────────────────
// A typed error that preserves the HTTP status code so callers can branch on
// 401 vs 403 vs 404 vs 422 etc. without string-matching the message.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** True for network/server errors the user can retry */
  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429
  }

  /** True when the session has expired — trigger re-auth */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** True when the user lacks permission — show access-denied UI, not an error */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /** True when the resource genuinely does not exist */
  get isNotFound(): boolean {
    return this.status === 404
  }
}

// ── Options ──────────────────────────────────────────────────────────────────

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  /**
   * Additional headers merged on top of the defaults.
   * Authorization and Content-Type are always set by apiFetch — do not supply them.
   */
  headers?: Record<string, string>
}
export function useTenantApi() {
  const { getAccessToken } = useAuth()

  /**
   * Authenticated fetch against `VITE_API_URL/api/<path>`.
   *
   * - Attaches Bearer token from Auth0.
   * - Sets Content-Type: application/json.
   * - Throws ApiError (with .status) on non-2xx responses.
   * - Returns null for 204 No Content responses.
   *
   * @param path  Relative path after /api/ — do NOT include a leading slash.
   * @param init  Standard RequestInit minus headers (use options.headers instead).
   */
  const apiFetch = useCallback(
    async <T = unknown>(path: string, init: ApiFetchOptions = {}): Promise<T> => {
      const token = await getAccessToken()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...init.headers,
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/${path}`, {
        ...init,
        headers,
      })

      // 204 No Content — valid success with no body
      if (response.status === 204) {
        return null as T
      }

      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`
        try {
          const body = await response.json()
          message = (body?.error ?? body?.message ?? message) as string
        } catch {
          // Response body was not JSON — keep the status-text message
        }
        throw new ApiError(response.status, message)
      }

      return (await response.json()) as T
    },
    [getAccessToken]
  )

  /**
   * Convenience wrapper for paginated list endpoints.
   * Expects the API to return `{ data: T[], total: number, page: number, per_page: number }`.
   */
  const apiFetchList = useCallback(
    async <T = unknown>(
      path: string,
      params?: Record<string, string | number | boolean | undefined>,
      init: ApiFetchOptions = {}
    ): Promise<PaginatedResponse<T>> => {
      const qs = params
        ? '?' +
          new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : ''

      return apiFetch<PaginatedResponse<T>>(`${path}${qs}`, init)
    },
    [apiFetch]
  )

  return { apiFetch, apiFetchList }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

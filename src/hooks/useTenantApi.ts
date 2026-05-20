import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createSupabaseClient } from '../integrations/supabase/client'

const FUNCTIONS_BASE_URL = `${import.meta.env.SUPABASE_URL}/functions/v1`

/**
 * Returns two stable, tenant-scoped async helpers:
 *
 *   getDb()            → Supabase client with the current Auth0 Bearer token.
 *   apiFetch(path, …)  → fetch() to an Edge Function with the same token.
 *
 * Both helpers silently acquire (or refresh) the Auth0 access token before
 * every call.  The token carries the custom claim:
 *
 *   https://easyops.app/organisation_id
 *
 * Supabase Row Level Security policies read this claim via:
 *
 *   auth.jwt() ->> 'https://easyops.app/organisation_id'
 *
 * so every query and Edge Function call is automatically scoped to the
 * authenticated user's organisation without any manual WHERE clauses on the
 * frontend.
 *
 * Usage inside a React Query queryFn:
 *
 *   const { getDb, apiFetch } = useTenantApi()
 *
 *   useQuery({
 *     queryKey: ['sites'],
 *     queryFn: async () => {
 *       const db = await getDb()
 *       const { data, error } = await db.from('sites').select('*')
 *       if (error) throw error
 *       return data
 *     },
 *     enabled: isAuthenticated,
 *   })
 */
export function useTenantApi() {
  const { getAccessToken, isAuthenticated } = useAuth()

  /**
   * Resolves an authenticated Supabase client.
   *
   * The Auth0 JWT is injected as `Authorization: Bearer <token>` so Supabase
   * validates it against your Third-Party Auth / custom JWT config and maps
   * `auth.uid()` to the Auth0 `sub`.  RLS then applies org-level isolation
   * automatically via the `organisation_id` claim in the token.
   */
  const getDb = useCallback(async (): Promise<SupabaseClient> => {
    const token = await getAccessToken()
    return createSupabaseClient(token)
  }, [getAccessToken])

  /**
   * Fetch a Supabase Edge Function with a Bearer token.
   *
   * @param path   Function name + optional query string.
   *               e.g. `'attendance-report?date_from=2024-01-01'`
   * @param init   Standard `RequestInit`.  `Authorization` and `Content-Type`
   *               headers are injected automatically — do not set them manually.
   * @returns      Parsed JSON body typed as `T`.
   * @throws       On any non-2xx status or network failure.
   *
   * @example
   *   const data = await apiFetch<AttendanceReport>('attendance-report', {
   *     method: 'POST',
   *     body: JSON.stringify({ date_from: '2024-01-01' }),
   *   })
   */
  const apiFetch = useCallback(
    async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getAccessToken()

      const headers = new Headers(init.headers)
      headers.set('Authorization', `Bearer ${token}`)
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }

      const response = await fetch(`${FUNCTIONS_BASE_URL}/${path}`, { ...init, headers })

      if (!response.ok) {
        // Capture backend error detail without swallowing it.
        const body = await response.text().catch(() => response.statusText)
        throw new Error(`[${response.status}] /${path}: ${body}`)
      }

      return response.json() as Promise<T>
    },
    [getAccessToken]
  )

  return { getDb, apiFetch, isAuthenticated }
}

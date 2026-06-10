// Client-side bearer-token attacher aligned with this project's Auth0 + Vite +
// Express stack (mirrors src/hooks/useTenantApi.ts). Replaces the original
// TanStack Start / Supabase Auth scaffold, which did not match this app.
import { useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// Returns a helper that merges an Auth0 access-token `Authorization` header into
// any outgoing request headers. Use it when calling the Express API directly:
//
//   const attachAuth0Auth = useAttachAuth0Auth()
//   const headers = await attachAuth0Auth()
//   await fetch(`${import.meta.env.VITE_API_URL}/api/...`, { headers })
//
// For typical data fetching prefer the `apiFetch` helper from useTenantApi,
// which already wraps this behaviour with error handling.
export function useAttachAuth0Auth() {
  const { getAccessTokenSilently } = useAuth0()

  return useCallback(
    async (headers: HeadersInit = {}): Promise<Headers> => {
      const merged = new Headers(headers)
      try {
        const token = await getAccessTokenSilently()
        merged.set('Authorization', `Bearer ${token}`)
      } catch (err) {
        console.warn('Failed to attach Auth0 token to request', err)
      }
      return merged
    },
    [getAccessTokenSilently]
  )
}

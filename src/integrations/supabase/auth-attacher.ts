// Client-side fetch helper: attaches the Auth0 access token (the canonical
// identity provider) from the in-memory token store as `Authorization:
// Bearer ...` on outgoing requests to Next.js route handlers. The same token
// is forwarded to Supabase/PostgREST so RLS evaluates the user's JWT claims.
'use client'

import { getAuth0AccessToken } from '../auth0/token-store'

// Wraps the native fetch, injecting the current Auth0 bearer token (when
// present) while preserving any caller-provided headers and init options.
export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getAuth0AccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}

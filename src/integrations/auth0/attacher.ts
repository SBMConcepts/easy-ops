// Client-side fetch helper: attaches the Auth0 access token from the in-memory
// token store as `Authorization: Bearer ...` on outgoing requests to Next.js
// route handlers. Pair with the server guards in `./middleware.server.ts`.
'use client'

import { getAuth0AccessToken } from './token-store'

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

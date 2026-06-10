// Browser-only in-memory store for the current Auth0 access token.
// Populated by Auth0Provider (see ./provider.tsx), consumed by:
//   - the Supabase browser client (forwards as Bearer to PostgREST -> RLS via auth.jwt())
//   - the `authedFetch` helper that attaches the Bearer token to API requests
let currentToken: string | null = null
const listeners = new Set<(token: string | null) => void>()

export function setAuth0AccessToken(token: string | null) {
  currentToken = token
  for (const l of listeners) l(token)
}

export function getAuth0AccessToken(): string | null {
  return currentToken
}

export function subscribeAuth0Token(listener: (token: string | null) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

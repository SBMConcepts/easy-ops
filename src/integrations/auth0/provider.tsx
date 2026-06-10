/* eslint-disable react-refresh/only-export-components */
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { useEffect, type ReactNode } from 'react'
import { setAuth0AccessToken } from './token-store'

// Required env (configure as Vite-exposed env vars / build secrets):
//   VITE_AUTH0_DOMAIN     - e.g. your-tenant.eu.auth0.com
//   VITE_AUTH0_CLIENT_ID  - SPA application client id from Auth0
//   VITE_AUTH0_AUDIENCE   - the API audience you registered (e.g. https://api.easyops.co.za). MUST match the Auth0 API identifier EXACTLY, or the backend will reject the token (401).

// This file only contains the Auth0Provider wrapper and related client-side glue.
// The actual token verification and user/org resolution happens in server/lib/auth.ts
// and server/lib/auth0-management.ts, which are used by the Express API routes.
const DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined
const CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined
const AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined

export function Auth0ProviderWithConfig({ children }: { children: ReactNode }) {
  if (!DOMAIN || !CLIENT_ID || !AUDIENCE) {
    // Render the app anyway so the Auth0 setup checklist page can be reached.
    return <MissingAuth0Config>{children}</MissingAuth0Config>
  }
  return (
    <Auth0Provider
      domain={DOMAIN}
      clientId={CLIENT_ID}
      authorizationParams={{
        redirect_uri:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        audience: AUDIENCE,
        scope: 'openid profile email offline_access',
      }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <Auth0TokenBridge>{children}</Auth0TokenBridge>
    </Auth0Provider>
  )
}

// Keeps the in-memory token store in sync with the Auth0 SPA SDK so that
// Supabase calls and server-fn calls can attach the current access token.
function Auth0TokenBridge({ children }: { children: ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently, user } = useAuth0()

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) {
      setAuth0AccessToken(null)
      return
    }
    ;(async () => {
      try {
        const token = await getAccessTokenSilently()
        if (!cancelled) setAuth0AccessToken(token)
      } catch (err) {
        console.warn('Auth0 token refresh failed:', err)
        if (!cancelled) setAuth0AccessToken(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.sub, getAccessTokenSilently])

  return <>{children}</>
}

function MissingAuth0Config({ children }: { children: ReactNode }) {
  if (typeof window !== 'undefined') {
    console.warn(
      '[Auth0] Missing VITE_AUTH0_DOMAIN / VITE_AUTH0_CLIENT_ID / VITE_AUTH0_AUDIENCE. Visit /auth/setup for the checklist.'
    )
  }
  return <>{children}</>
}

export const auth0ConfigStatus = {
  configured: Boolean(DOMAIN && CLIENT_ID && AUDIENCE),
  domain: DOMAIN ?? null,
  clientId: CLIENT_ID ?? null,
  audience: AUDIENCE ?? null,
}

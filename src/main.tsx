import { Auth0Provider } from '@auth0/auth0-react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from './lib/auth0-config.ts'
import './index.css'
import { TenantProvider } from './contexts/TenantContext.tsx'

createRoot(document.getElementById('root')!).render(
  <TenantProvider>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin + '/app',
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
    >
      <App />
    </Auth0Provider>
  </TenantProvider>
)

import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from './lib/auth0-config'
import { DatabaseProvider } from './contexts/DatabaseContext'

// After login Auth0 returns the org_id inside the JWT; AuthContext uses that
// to resolve the tenant from the database. No slug hints or subdomains needed.

createRoot(document.getElementById('root')!).render(
  <Auth0Provider
    domain={AUTH0_DOMAIN}
    clientId={AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: `${window.location.origin}` + '/app',
      audience: AUTH0_AUDIENCE,
      scope: ' openid profile email',
    }}
  >
    <DatabaseProvider>
      <App />
    </DatabaseProvider>
  </Auth0Provider>
)

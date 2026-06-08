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
      redirect_uri: `${import.meta.env.VITE_AUTH0_DOMAIN}/dashboard`,
      audience: AUTH0_AUDIENCE,
    }}
  >
    <DatabaseProvider>
      <App />
    </DatabaseProvider>
  </Auth0Provider>
)

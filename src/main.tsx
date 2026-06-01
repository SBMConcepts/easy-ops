import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from './lib/auth0-config'

// After login Auth0 returns the org_id inside the JWT; AuthContext uses that
// to resolve the tenant from the database. No slug hints or subdomains needed.
const redirectUri = `https://easy-ops-za.vercel.app/app`

createRoot(document.getElementById('root')!).render(
  <Auth0Provider
    domain="https://easy-ops.us.auth0.com"
    clientId={AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: redirectUri,
      audience: AUTH0_AUDIENCE,
    }}
  >
    <App />
  </Auth0Provider>
)

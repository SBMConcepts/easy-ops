import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from './lib/auth0-config'
import { getTenantSlug } from './utils/subdomain'

// Resolve the tenant slug from either /t/:slug path or subdomain (based on VITE_TENANT_MODE).
// Used to pre-select the Auth0 Organization and set the correct callback URL.
const slug = getTenantSlug()

const redirectUri = slug
  ? `${window.location.origin}/t/${slug}/app/`
  : `${window.location.origin}/app/`

createRoot(document.getElementById('root')!).render(
  <Auth0Provider
    domain={AUTH0_DOMAIN}
    clientId={AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: redirectUri,
      audience: AUTH0_AUDIENCE,
      ...(slug ? { organization: slug } : {}),
    }}
  >
    <App />
  </Auth0Provider>
)

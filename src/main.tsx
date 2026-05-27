import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'

import { getSubdomain } from './utils/subdomain'

// Read the tenant slug from the subdomain (e.g. "acme" from acme.easy-ops-za.vercel.app).
// Passed as `organization` so Auth0 scopes the login to that org automatically.
const organization = getSubdomain() ?? undefined

createRoot(document.getElementById('root')!).render(
  <Auth0Provider
    domain="easy-ops.us.auth0.com"
    clientId="4mq3vC8yk6e2odjAM7OtXjC5OPeKFecZ"
    authorizationParams={{
      redirect_uri: window.location.origin,
    }}
  >
    <App />
  </Auth0Provider>
)

import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.tsx'
import './index.css'
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from './lib/auth0-config'
import { getSubdomain } from './utils/subdomain'

const organization = getSubdomain() ?? undefined

const isWorkspace = !!organization
const redirectUri = `${window.location.origin}${isWorkspace ? '/app/' : '/'}`

createRoot(document.getElementById('root')!).render(
  <Auth0Provider
    domain={AUTH0_DOMAIN}
    clientId={AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: redirectUri,
      audience: AUTH0_AUDIENCE,
      ...(organization ? { organization } : {}),
    }}
  >
    <App />
  </Auth0Provider>
)

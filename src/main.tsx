import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { DatabaseProvider } from './contexts/DatabaseContext'

// The Express backend is the confidential OAuth client (Regular Web App): it
// runs the code exchange and owns the session cookie. The browser holds no
// Auth0 tokens, so there is no Auth0Provider here — identity is read from the
// backend session via AuthContext, and org_id rides in the server-side session.

createRoot(document.getElementById('root')!).render(
  <DatabaseProvider>
    <App />
  </DatabaseProvider>
)

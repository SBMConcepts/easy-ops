import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { DatabaseProvider } from './contexts/DatabaseContext'

// Supabase Auth owns the session. The DatabaseProvider exposes the session-aware
// Supabase client; AuthContext resolves the user's tenant from public.memberships.
createRoot(document.getElementById('root')!).render(
  <DatabaseProvider>
    <App />
  </DatabaseProvider>
)

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://your-project-ref.supabase.co'
const SUPABASE_ANON_KEY = 'your-public-anon-key' // Safe to expose publicly on client bundles

const DatabaseContext = createContext<SupabaseClient | null>(null)

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0()
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    if (isLoading) return

    const buildKeylessClient = async () => {
      if (!isAuthenticated) {
        // Fallback for public checkout / registration pages
        setSupabaseClient(createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
        return
      }

      try {
        // Fetch the cryptographic token issued natively by Auth0
        const token = await getAccessTokenSilently()

        // Instantiate Supabase injected with our active token
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        })
        setSupabaseClient(client)
      } catch (err) {
        console.error('Failed to instantiate secure database layer:', err)
      }
    }

    void buildKeylessClient()
  }, [getAccessTokenSilently, isAuthenticated, isLoading])

  return <DatabaseContext.Provider value={supabaseClient}>{children}</DatabaseContext.Provider>
}

export const useDB = () => {
  const context = useContext(DatabaseContext)
  if (!context) throw new Error('useDB must be wrapped inside a DatabaseProvider element.')
  return context
}

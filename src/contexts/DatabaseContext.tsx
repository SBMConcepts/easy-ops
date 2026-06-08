/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../server/types/supabase' // Adjust path to your supabase.ts

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Strongly typed Supabase Client
export type TypedSupabaseClient = SupabaseClient<Database>

const DatabaseContext = createContext<TypedSupabaseClient | null | undefined>(undefined)

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0()
  const [supabaseClient, setSupabaseClient] = useState<TypedSupabaseClient | null>(null)

  useEffect(() => {
    if (isLoading) return

    // SAFETY CHECK: Wait for Auth0 SDK to clear OAuth callback parameters from the URL
    const hasAuthParams =
      window.location.search.includes('code=') && window.location.search.includes('state=')
    if (hasAuthParams) return

    const buildKeylessClient = async () => {
      if (!isAuthenticated) {
        setSupabaseClient(createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY))
        return
      }

      try {
        const token = await getAccessTokenSilently()

        const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  if (context === undefined) throw new Error('useDB must be used within a DatabaseProvider')
  return context // null while the client is still initialising
}

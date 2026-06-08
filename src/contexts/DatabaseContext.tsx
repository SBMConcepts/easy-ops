/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../server/types/supabase'
import { createSupabaseClient, supabasePublic } from '../integrations/supabase/client'

// Strongly typed Supabase Client
export type TypedSupabaseClient = SupabaseClient<Database>

// Canonical anon singleton — valid from first render, never null or undefined
const anonClient = supabasePublic as TypedSupabaseClient

const DatabaseContext = createContext<TypedSupabaseClient>(anonClient)

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0()
  const [authenticatedClient, setAuthenticatedClient] = useState<TypedSupabaseClient | null>(null)

  // Derive the active client: fall back to anon whenever the user is not signed in
  const supabaseClient = isAuthenticated && authenticatedClient ? authenticatedClient : anonClient

  // Upgrade to an authenticated client once Auth0 is ready and the user is signed in
  useEffect(() => {
    if (isLoading) return

    // SAFETY CHECK: Wait for Auth0 SDK to clear OAuth callback parameters from the URL
    const hasAuthParams =
      window.location.search.includes('code=') && window.location.search.includes('state=')
    if (hasAuthParams) return

    if (!isAuthenticated) return

    const upgradeToAuthenticatedClient = async () => {
      try {
        const token = await getAccessTokenSilently()

        setAuthenticatedClient(createSupabaseClient(token) as TypedSupabaseClient)
      } catch (err) {
        console.error('Failed to upgrade to authenticated database client:', err)
        // Keep existing client active as a safe fallback
      }
    }

    void upgradeToAuthenticatedClient()
  }, [getAccessTokenSilently, isAuthenticated, isLoading])

  return <DatabaseContext.Provider value={supabaseClient}>{children}</DatabaseContext.Provider>
}

export const useDB = (): TypedSupabaseClient => useContext(DatabaseContext)

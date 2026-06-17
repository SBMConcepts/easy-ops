/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../server/types/supabase'
import { createSupabaseClient } from '../integrations/supabase/client'
import { AUTH0_CLAIM_NS } from '../lib/auth0-config'

export type TypedSupabaseClient = SupabaseClient<Database>

const anonClient = createSupabaseClient() as TypedSupabaseClient

const createAuthenticatedClient = (getToken: () => Promise<string | null>): TypedSupabaseClient =>
  createSupabaseClient(getToken) as TypedSupabaseClient

const DatabaseContext = createContext<TypedSupabaseClient>(anonClient)

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Swap getAccessTokenSilently for getIdTokenClaims
  const { getIdTokenClaims, isAuthenticated, isLoading } = useAuth0()
  const [authenticatedClient, setAuthenticatedClient] = useState<TypedSupabaseClient | null>(null)

  const supabaseClient = isAuthenticated && authenticatedClient ? authenticatedClient : anonClient

  useEffect(() => {
    if (isLoading) return

    const hasAuthParams =
      window.location.search.includes('code=') && window.location.search.includes('state=')
    if (hasAuthParams) return

    if (!isAuthenticated) return

    const upgradeToAuthenticatedClient = async () => {
      try {
        // 2. Create a custom token fetcher that extracts the Supabase JWT from the ID Token claims
        const getSupabaseToken = async () => {
          const claims = await getIdTokenClaims()
          // Ensure your Auth0 Action uses this exact namespace when setting the claim
          return (claims?.[`${AUTH0_CLAIM_NS}supabase_jwt`] as string) || null
        }

        // 3. Probe the token fetcher to ensure the claim exists before upgrading
        const token = await getSupabaseToken()
        if (token) {
          setAuthenticatedClient(createAuthenticatedClient(getSupabaseToken))
        } else {
          console.warn('Authenticated with Auth0, but missing Supabase JWT claim.')
        }
      } catch (err) {
        console.error('Failed to upgrade to authenticated database client:', err)
      }
    }

    void upgradeToAuthenticatedClient()
  }, [getIdTokenClaims, isAuthenticated, isLoading])

  return <DatabaseContext.Provider value={supabaseClient}>{children}</DatabaseContext.Provider>
}

export const useDB = (): TypedSupabaseClient => useContext(DatabaseContext)

/* eslint-disable react-refresh/only-export-components */
// src/contexts/DatabaseContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ewniypaosorbepjxnqqz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qXU5qD57lx-TG94X2IYq_g_4j-eqrja' // Safe to expose publicly

const DatabaseContext = createContext<SupabaseClient | null>(null)

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    const initClient = async () => {
      if (!isAuthenticated) {
        // Initialize an unauthenticated client for public registration routes
        setSupabase(createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
        return
      }

      // Fetch the cryptographic token issued by Auth0
      const token = await getAccessTokenSilently()

      // Instantiate Supabase with the incoming Auth0 Authorization Bearer Context
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })

      setSupabase(client)
    }

    void initClient()
  }, [getAccessTokenSilently, isAuthenticated])

  return <DatabaseContext.Provider value={supabase}>{children}</DatabaseContext.Provider>
}

export const useDB = () => useContext(DatabaseContext)

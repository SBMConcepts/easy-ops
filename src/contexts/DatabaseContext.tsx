/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../integrations/supabase/types'
import { createSupabaseClient } from '../integrations/supabase/client'

export type TypedSupabaseClient = SupabaseClient<Database>

const anonClient = createSupabaseClient() as TypedSupabaseClient

const createAuthenticatedClient = (getToken: () => Promise<string | null>): TypedSupabaseClient =>
  createSupabaseClient(getToken) as TypedSupabaseClient

const DatabaseContext = createContext<TypedSupabaseClient>(anonClient)

const SUPABASE_TOKEN_URL = `${(import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')}/supabase-token`

const fetchSupabaseToken = async (): Promise<string | null> => {
  try {
    const res = await fetch(SUPABASE_TOKEN_URL, { credentials: 'include' })
    if (!res.ok) return null
    const body = (await res.json()) as { token?: string }
    return body?.token ?? null
  } catch {
    return null
  }
}

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authenticatedClient, setAuthenticatedClient] = useState<TypedSupabaseClient | null>(null)

  const supabaseClient = authenticatedClient ?? anonClient

  useEffect(() => {
    let cancelled = false

    const upgradeToAuthenticatedClient = async () => {
      const token = await fetchSupabaseToken()
      if (cancelled || !token) return

      setAuthenticatedClient(createAuthenticatedClient(fetchSupabaseToken))
    }

    void upgradeToAuthenticatedClient()
    return () => {
      cancelled = true
    }
  }, [])

  return <DatabaseContext.Provider value={supabaseClient}>{children}</DatabaseContext.Provider>
}

export const useDB = (): TypedSupabaseClient => useContext(DatabaseContext)

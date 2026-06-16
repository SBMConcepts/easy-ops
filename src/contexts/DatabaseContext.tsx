/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../integrations/supabase/types'
import { supabase } from '../integrations/supabase/client'

// Strongly typed Supabase Client
export type TypedSupabaseClient = SupabaseClient<Database>

const DatabaseContext = createContext<TypedSupabaseClient>(supabase)

// Supabase Auth owns the session, so a single client instance handles both
// anonymous and authenticated access — it attaches the current user's JWT
// automatically once they sign in. No Auth0 token plumbing required.
export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <DatabaseContext.Provider value={supabase}>{children}</DatabaseContext.Provider>
}

export const useDB = (): TypedSupabaseClient => useContext(DatabaseContext)

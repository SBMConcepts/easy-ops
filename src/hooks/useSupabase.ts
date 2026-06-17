// hooks/useSupabase.ts
import { useAuth0 } from '@auth0/auth0-react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

// Define the namespace you used in your Auth0 Action
const CLAIM_NAMESPACE = 'https://easy-ops-za.vercel.app/supabase_jwt'

export function useSupabase(): SupabaseClient {
  const { getIdTokenClaims } = useAuth0()

  return useMemo(() => {
    return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      global: {
        // Override fetch to inject the dynamic token on every request
        fetch: async (url, options = {}) => {
          const claims = await getIdTokenClaims()
          const supabaseToken = claims?.[CLAIM_NAMESPACE]

          const headers = new Headers(options?.headers)
          if (supabaseToken) {
            headers.set('Authorization', `Bearer ${supabaseToken}`)
          }

          return fetch(url, { ...options, headers })
        },
      },
    })
  }, [getIdTokenClaims])
}

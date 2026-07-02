// hooks/useSupabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

const SUPABASE_TOKEN_URL = `${(import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')}/supabase-token`

export function useSupabase(): SupabaseClient {
  return useMemo(() => {
    return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      global: {
        // Override fetch to inject the dynamic token on every request
        fetch: async (url, options = {}) => {
          let supabaseToken: string | null = null
          try {
            const res = await fetch(SUPABASE_TOKEN_URL, { credentials: 'include' })
            if (res.ok) supabaseToken = ((await res.json()) as { token?: string })?.token ?? null
          } catch {
            /* fall through to anon */
          }

          const headers = new Headers(options?.headers)
          if (supabaseToken) {
            headers.set('Authorization', `Bearer ${supabaseToken}`)
          }

          return fetch(url, { ...options, headers })
        },
      },
    })
  }, [])
}

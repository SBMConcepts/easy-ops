/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useState } from 'react'
import { getSubdomain } from '../utils/subdomain'

const SUPABASE_URL = import.meta.env.SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY as string

interface TenantInfo {
  id: string // Local Database Tenant UUID
  name: string // Company Title (e.g., Acme Corp)
  auth0OrgId: string // Auth0 org_id (e.g., org_123)
  slug: string
}

interface TenantContextType {
  tenant: TenantInfo | null
  isLoading: boolean
  isCustomSubdomain: boolean
  /** Call this when the user initiates login to resolve the tenant. */
  resolveTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: false,
  isCustomSubdomain: false,
  resolveTenant: async () => {},
})

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const slug = getSubdomain()

  const resolveTenant = useCallback(async () => {
    if (!slug || tenant) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tenant-lookup?slug=${encodeURIComponent(slug)}`,
        { headers: { apikey: SUPABASE_ANON_KEY } }
      )
      if (response.ok) {
        const data = await response.json()
        setTenant({
          id: data.id,
          name: data.name,
          auth0OrgId: data.auth0_org_id,
          slug,
        })
      }
    } catch (error) {
      console.error('Error resolving tenant subdomain:', error)
    } finally {
      setIsLoading(false)
    }
  }, [slug, tenant])

  return (
    <TenantContext.Provider value={{ tenant, isLoading, isCustomSubdomain: !!slug, resolveTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)

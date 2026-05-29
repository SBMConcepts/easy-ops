/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useState } from 'react'

// Point this to your new Express Backend URL
const API_URL = import.meta.env.VITE_API_URL as string

interface TenantInfo {
  id: string // Local Postgres UUID (public.tenants.id)
  name: string // Company Title
  auth0OrgId: string // Auth0 org_id
  slug: string // Workspace subdomain slug
}

interface TenantContextType {
  tenant: TenantInfo | null
  isLoading: boolean
  isCustomSubdomain: boolean
  resolveTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: false,
  isCustomSubdomain: false,
  resolveTenant: async () => {},
})

export const TenantProvider: React.FC<{ children: React.ReactNode; slug: string }> = ({
  children,
  slug,
}) => {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // slug comes from the /t/:slug route param — no URL reading needed here

  const resolveTenant = useCallback(async () => {
    if (!slug || tenant) return

    setIsLoading(true)
    try {
      // Lookup the tenant via your Express API instead of a Supabase Edge Function
      const response = await fetch(`${API_URL}/api/tenant-lookup?slug=${encodeURIComponent(slug)}`)

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
    <TenantContext.Provider
      value={{
        tenant,
        isLoading,
        isCustomSubdomain: !!slug,
        resolveTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)

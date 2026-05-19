/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getSubdomain } from '../utils/subdomain'
import { AUTH0_AUDIENCE } from '../lib/auth0-config'

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
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  isCustomSubdomain: false,
})

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const slug = getSubdomain()

  useEffect(() => {
    async function resolveTenant() {
      if (!slug) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch tenant details from your backend API mapping layer
        const response = await fetch(AUTH0_AUDIENCE)
        if (response.ok) {
          const data = await response.json()
          setTenant({
            id: data.id,
            name: data.name,
            auth0OrgId: data.auth0_org_id,
            slug: slug,
          })
        }
      } catch (error) {
        console.error('Error resolving tenant subdomain:', error)
      } finally {
        setIsLoading(false)
      }
    }

    resolveTenant()
  }, [slug])

  return (
    <TenantContext.Provider value={{ tenant, isLoading, isCustomSubdomain: !!slug }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)

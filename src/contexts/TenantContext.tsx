/**
 * TenantContext — Compatibility shim over AuthContext.
 *
 * Tenant resolution is authoritative: after Auth0 login, the JWT contains
 * `org_id` which AuthContext uses to resolve the workspace context.
 */
/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { useAuth, type AuthTenant } from './AuthContext'

export type { AuthTenant }

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
)

export const useTenant = () => {
  const { tenant, isLoading } = useAuth()

  return {
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          auth0_org_id: tenant.auth0_org_id,
          logo_url: tenant.logo_url || null,
          status: tenant.status || null,
          settings: tenant.settings || null,
        }
      : null,
    isLoading,
    resolveTenant: async () => {}, // No-op: handled automatically by AuthContext JWT
  }
}

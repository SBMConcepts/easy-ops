/**
 * TenantContext — thin compatibility shim over AuthContext.
 *
 * Tenant resolution is now authoritative: after Auth0 login the JWT contains
 * `org_id` which AuthContext uses to resolve the tenant from the database.
 * This file re-exports that data so existing callers of `useTenant()` keep
 * working without changes.  `TenantProvider` is a passthrough — no API call
 * needed.
 */
/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { useAuth } from './AuthContext'

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
          auth0OrgId: tenant.id, // AuthContext Tenant.id is the local UUID; use slug for auth0 org
          slug: tenant.slug,
        }
      : null,
    isLoading,
    isCustomSubdomain: !!tenant,
    resolveTenant: async () => {}, // no-op — resolution is handled by AuthContext via JWT
  }
}

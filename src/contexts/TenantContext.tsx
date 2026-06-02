/**
 * TenantContext — Compatibility shim over AuthContext.
 *
 * Tenant resolution is authoritative: after Auth0 login, the JWT contains
 * `org_id` which AuthContext uses to resolve the workspace context.
 * This file re-exports that context data so legacy callers of `useTenant()` keep
 * functioning smoothly without immediate component-level code modification.
 */
/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { useAuth, type AuthTenant } from './AuthContext'

// Re-export for consumers that import AuthTenant from TenantContext
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
        }
      : null,
    isLoading,
    resolveTenant: async () => {}, // No-op: resolution is handled via Auth0 JWT org_id claim
  }
}

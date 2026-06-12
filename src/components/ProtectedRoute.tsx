import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  useAuth,
  useAuthRole,
  usePermissions,
  type TenantRole,
  type AppPermission,
} from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: TenantRole[]
  // Capability gate: caller must hold AT LEAST ONE of these permissions. Takes
  // precedence over allowedRoles when both are supplied.
  requiredPermissions?: AppPermission[]
}

const ProtectedRoute = ({ children, allowedRoles, requiredPermissions }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, tenant, user } = useAuth()
  const { hasMinRole, isAdmin } = useAuthRole()
  const { hasAnyPermission } = usePermissions()
  const location = useLocation()

  const loginPath = '/login'
  const onboardingPath = '/app/onboarding'
  const appPath = '/app'

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  const needsOnboarding =
    isAdmin && tenant?.status === 'provisioning' && location.pathname !== onboardingPath

  if (needsOnboarding) {
    return <Navigate to={onboardingPath} replace />
  }

  // Permission gate (preferred): block when the caller holds none of the
  // required capabilities.
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAnyPermission(...requiredPermissions)) {
      return <Navigate to={appPath} replace />
    }
    return <>{children}</>
  }

  // Legacy role-tier gate: pass when the user meets the minimum tier of ANY allowed role.
  if (allowedRoles && user && !allowedRoles.some((role) => hasMinRole(role))) {
    return <Navigate to={appPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

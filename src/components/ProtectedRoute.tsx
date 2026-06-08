import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, useAuthRole, type TenantRole } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: TenantRole[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, tenant, user } = useAuth()
  const { hasMinRole, isAdmin } = useAuthRole()
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

  // If the route specifies allowedRoles, check if the user meets the minimum tier of ANY allowed role.
  if (allowedRoles && user && !allowedRoles.some((role) => hasMinRole(role))) {
    return <Navigate to={appPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

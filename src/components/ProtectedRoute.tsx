import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, useAuthRole, type TenantRole } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  // Access-tier gate: caller's role (owner|admin|member|viewer) must be listed.
  allowedRoles?: TenantRole[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, tenant, user } = useAuth()
  const { isAdmin } = useAuthRole()
  const location = useLocation()

  const loginPath = '/login'
  const onboardingPath = '/app/onboarding'
  const appPath = '/app'

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  // Organization gate: an authenticated user with no organization (tenant)
  // context cannot access tenant-scoped views. This is the Express/SPA
  // equivalent of the former Next.js edge middleware that redirected sessions
  // lacking an org claim away from protected routes.
  if (!tenant?.auth0_org_id) {
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  const needsOnboarding =
    isAdmin && tenant?.status === 'provisioning' && location.pathname !== onboardingPath

  if (needsOnboarding) {
    return <Navigate to={onboardingPath} replace />
  }

  // Access-tier gate: pass when the user's role is in the allowed set.
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={appPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

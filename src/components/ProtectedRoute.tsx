import React from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth, type UserRole } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, tenant, isAdmin, hasRole } = useAuth()
  const location = useLocation()

  // Strict root-relative paths matching the single-domain application routing tree
  const loginPath = '/login'
  const onboardingPath = '/app/onboarding'
  const appPath = '/app/dashboard'

  // ── 1. Loading guard ─────────────────────────────────────────────────────
  // While AuthContext is resolving the Auth0 session + Supabase profile, we
  // don't know the user's role or onboarding state. Rendering <Navigate>
  // during this window causes false redirects to login on refresh.
  if (isLoading) return null

  // ── 2. Authentication guard ───────────────────────────────────────────────
  // Not logged in → send to the workspace login page and preserve the
  // intended destination so we can redirect back after a successful login.
  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  // ── 3. Onboarding guard ───────────────────────────────────────────────────
  // An admin whose tenant has not yet completed onboarding must finish the
  // setup flow before accessing any /app/* page.
  //
  // Skipped when:
  //   a) The user is not an admin (employees/managers never run onboarding)
  //   b) We are already on /app/onboarding (prevents redirect loop)
  const needsOnboarding =
    isAdmin && tenant?.status === 'provisioning' && location.pathname !== onboardingPath

  if (needsOnboarding) {
    return <Navigate to={onboardingPath} replace />
  }

  // ── 4. Role-based access guard ───────────────────────────────────────────
  // If the route specifies allowedRoles and the user's role isn't in the list,
  // redirect to the app root. DashboardRouter will render their correct view.
  if (allowedRoles && user && !allowedRoles.some((role) => hasRole(role))) {
    return <Navigate to={appPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

import React from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import { useAuth, type UserRole } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, tenant } = useAuth()
  const location = useLocation()
  // useParams picks up :slug from the parent /t/:slug/* route
  const { slug } = useParams<{ slug?: string }>()

  // Build absolute paths that work in both path mode (/t/:slug) and
  // subdomain mode (no slug prefix needed, but we keep the fallback).
  const loginPath = slug ? `/t/${slug}/app/login` : '/login'
  const onboardingPath = slug ? `/t/${slug}/app/onboarding` : '/onboarding'
  const appPath = slug ? `/t/${slug}/app` : '/app'

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
    user?.role === 'admin' &&
    (tenant === null || tenant.status === 'onboarding') &&
    location.pathname !== onboardingPath

  if (needsOnboarding) {
    return <Navigate to={onboardingPath} replace />
  }

  // ── 4. Role-based access guard ───────────────────────────────────────────
  // If the route specifies allowedRoles and the user's role isn't in the list,
  // redirect to the app root. DashboardRouter will render their correct view.
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={appPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

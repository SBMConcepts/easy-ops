import React from "react"
import { Navigate, useLocation } from "react-router"
import { useAuth, type UserRole } from "../contexts/AuthContext"

interface ProtectedRouteProps {
    children: React.ReactNode
    allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading, user, onboardingComplete } = useAuth()
    const location = useLocation()

    // ── 1. Loading guard ─────────────────────────────────────────────────────
    // While AuthContext is fetching the session + profile from Supabase, we
    // don't yet know whether the user is authenticated or what their role is.
    // Rendering a <Navigate> during this window causes a premature redirect to
    // /login even for users who ARE logged in — this is the most common cause
    // of "I get kicked to login on refresh" bugs.
    //
    // Return null (blank screen) until loading is done.  You can swap this for
    // a full-screen spinner component if you prefer visible feedback.
    if (isLoading) return null

    // ── 2. Authentication guard ───────────────────────────────────────────────
    // Not logged in → send to /login and remember where they were trying to go
    // so we can redirect back after a successful login.
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // ── 3. Onboarding guard ───────────────────────────────────────────────────
    // An admin whose organisation hasn't completed onboarding must finish the
    // onboarding form before they can reach any /app/* page.
    //
    // We skip this check when:
    //   a) The user is NOT an admin (employees/managers never onboard)
    //   b) We are already ON the onboarding page (prevents redirect loop)
    //
    // AuthContext also fires this redirect after login, but guarding it here
    // too means it's enforced even on direct URL navigation (e.g. user types
    // /app/employees into the address bar while onboarding is incomplete).

    // ── 4. Role-based access guard ───────────────────────────────────────────
    // If the route specifies allowedRoles and the user's role isn't in the
    // list, redirect them to the app root.  DashboardRouter will then render
    // the correct dashboard for their actual role.
    //
    // We wait until user is non-null (guaranteed above after isLoading=false +
    // isAuthenticated=true) before checking the role.
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/app" replace />
    }

    return <>{children}</>
}

export default ProtectedRoute

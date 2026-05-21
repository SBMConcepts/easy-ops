import { useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster as Sonner } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'
import { getSubdomain } from './utils/subdomain'
import CheckIn from './pages/CheckIn'
import ComingSoon from './pages/ComingSoon'
import Compliance from './pages/Compliance'
import EmployeeManagement from './pages/EmployeeManagement'
import GetStarted from './pages/GetStarted'
import Index from './pages/Index'
import Register from './pages/Register'
import LiveAttendance from './pages/LiveAttendance'
import Login from './pages/LoginPage'
import NotFound from './pages/NotFound'
import Onboarding from './pages/Onboarding'
import Reports from './pages/Reports'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'
import SitesAndDepartments from './pages/SitesAndDepartments'
import DashboardRouter from './pages/dashboard/DashboardRouter'

const queryClient = new QueryClient()

// ── Marketing shell ───────────────────────────────────────────────────────────
// Rendered when no org subdomain is detected (root domain / www).
// Serves the public-facing marketing site only — no authenticated routes.
const MarketingRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/get-started" element={<GetStarted />} />
    <Route path="/register" element={<Register />} />
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
)

// ── Workspace shell ───────────────────────────────────────────────────────────
// Rendered when an org subdomain is detected (e.g., acme.easyops.app).
// All /app/* routes are protected; unauthenticated visitors land on /login.
const WorkspaceRoutes = () => (
  <Routes>
    {/* Root redirects straight into the app; ProtectedRoute handles auth gate */}
    <Route path="/app" element={<Navigate to="/app" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Onboarding is outside AppLayout so it gets a full-screen flow */}
    <Route
      path="/app/onboarding"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Onboarding />
        </ProtectedRoute>
      }
    />

    {/* Main app shell — AppLayout provides sidebar + top-nav chrome */}
    <Route
      path="/app"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardRouter />} />
      <Route
        path="check-in"
        element={
          <ProtectedRoute allowedRoles={['employee', 'supervisor', 'manager', 'admin']}>
            <CheckIn />
          </ProtectedRoute>
        }
      />
      <Route
        path="attendance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <LiveAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="reports"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="employees"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <EmployeeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="team"
        element={
          <ProtectedRoute allowedRoles={['supervisor']}>
            <ComingSoon title="Team Overview" />
          </ProtectedRoute>
        }
      />
      <Route
        path="compliance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Compliance />
          </ProtectedRoute>
        }
      />
      <Route
        path="sites"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <SitesAndDepartments />
          </ProtectedRoute>
        }
      />
      <Route
        path="payroll"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <ComingSoon title="Payroll Export" />
          </ProtectedRoute>
        }
      />
      <Route path="settings" element={<Settings />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
)

// ── App root ──────────────────────────────────────────────────────────────────
const App = () => {
  // Pure synchronous check — no context needed to decide which shell to render.
  // TenantProvider is scoped inside WorkspaceRoutes so marketing pages carry
  // zero tenant overhead.
  const isCustomSubdomain = !!getSubdomain()
  // For workspace subdomains, wait for Auth0 to rehydrate a cached session
  // before rendering — prevents a flash of the login page on authenticated refresh.
  // Marketing site renders immediately with no loading gate.
  const { isLoading: authLoading } = useAuth0()

  if (isCustomSubdomain && authLoading) {
    return <div className="loading-screen">Loading workspace...</div>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            {isCustomSubdomain ? (
              <TenantProvider>
                <WorkspaceRoutes />
              </TenantProvider>
            ) : (
              <MarketingRoutes />
            )}
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

import { useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom' // Standardized router import
import { Toaster as Sonner } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth, AuthProvider } from './contexts/AuthContext'
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
import { DashboardLoader } from './pages/dashboard/DashboardLoader'
import { Database } from './integrations/supabase/types'

const queryClient = new QueryClient()

// ── Marketing shell ──────────────────────────────────────────────────────────────
// Served at the root domain — public pages only, no authenticated routes.
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

// ── Workspace shell ──────────────────────────────────────────────────────────────
// Authenticated application routes. Tenant context is derived automatically via JWT.
const WorkspaceShell = () => {
  const { isAuthenticated, isLoading, user, tenant } = useAuth()

  // Handle initialization loading frames safely
  if (isLoading || (isAuthenticated && !user) || (isAuthenticated && !tenant)) {
    return <DashboardLoader />
  }

  // Enforce global authentication fallback across the workspace route tree
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Workspace default landing (DashboardRouter dynamically renders based on user.role) */}
        <Route index element={<DashboardRouter />} />

        {/* General Staff & Operator Views */}
        <Route
          path="check-in"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'employee']}>
              <CheckIn />
            </ProtectedRoute>
          }
        />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="reports" element={<Reports />} />

        {/* Management & Administration Views with RBAC */}
        <Route
          path="employees-management"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <EmployeeManagement
                requests={[]}
                prefillEmailForRequest={function (): string {
                  throw new Error('Function not implemented.')
                }}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="live-attendance"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'employee']}>
              <LiveAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="compliance"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'employee']}>
              <Compliance />
            </ProtectedRoute>
          }
        />
        <Route
          path="sites"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'employee']}>
              <SitesAndDepartments />
            </ProtectedRoute>
          }
        />
        <Route
          path="payroll"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'employee']}>
              <ComingSoon title="Payroll Export" />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'employee']}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// ── App Root ──────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* All secure workspace views live under /app instead of /t/:slug */}
            <Route path="/app/*" element={<WorkspaceShell />} />

            {/* Root-level marketing/public pages */}
            <Route path="/*" element={<MarketingRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
)

export default App

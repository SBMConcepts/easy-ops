import { useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router'
import { Toaster as Sonner } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'
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
// Mounted at /t/:slug/* — all child paths are relative to that prefix.
// To switch to subdomain mode, set VITE_TENANT_MODE=subdomain in .env.
const WorkspaceShell = () => {
  const { slug } = useParams<{ slug: string }>()
  const { isLoading: authLoading } = useAuth0()

  if (authLoading) {
    return <div className="loading-screen">Loading workspace...</div>
  }

  return (
    <TenantProvider slug={slug!}>
      <Routes>
        {/* /t/:slug -> /t/:slug/app */}
        <Route index element={<Navigate to="app" replace />} />
        <Route path="app/login" element={<Login />} />
        <Route path="app/reset-password" element={<ResetPassword />} />

        {/* Onboarding has its own full-screen layout */}
        <Route
          path="app/onboarding"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Main app shell — AppLayout provides sidebar + top-nav chrome */}
        <Route
          path="app"
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
                <EmployeeManagement
                  requests={[]}
                  prefillEmailForRequest={function (req: {
                    id: string
                    status: string
                    requester_email: string
                  }): string {
                    throw new Error('Function not implemented.')
                  }}
                />
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
    </TenantProvider>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Workspace shell — all tenant routes live under /t/:slug */}
            <Route path="/t/:slug/*" element={<WorkspaceShell />} />
            {/* Marketing shell — root domain public pages */}
            <Route path="/*" element={<MarketingRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
)

export default App

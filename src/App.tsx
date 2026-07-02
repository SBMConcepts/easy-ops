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
import SettingsLayout from './layouts/SettingsLayout'
import SitesAndDepartments from './pages/SitesAndDepartments'
import DashboardRouter from './pages/dashboard/DashboardRouter'
import { DashboardLoader } from './pages/dashboard/DashboardLoader'
import SettingsProfile from './pages/settings/SettingsProfile'
import SettingsAttendance from './pages/settings/SettingsAttendance'
import SettingsSecurity from './pages/settings/SettingsSecurity'

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
// Authenticated application routes. Organization context is derived automatically via JWT.
const WorkspaceShell = () => {
  const { isAuthenticated, isLoading, user, organization } = useAuth()

  // Handle initialization loading frames safely
  if (isLoading || (isAuthenticated && !user) || (isAuthenticated && !organization)) {
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
            <ProtectedRoute allowedRoles={['owner', 'admin', 'member', 'viewer']}>
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
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="live-attendance"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'member', 'viewer']}>
              <LiveAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="compliance"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'member', 'viewer']}>
              <Compliance />
            </ProtectedRoute>
          }
        />
        <Route
          path="sites"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'member', 'viewer']}>
              <SitesAndDepartments />
            </ProtectedRoute>
          }
        />
        <Route
          path="payroll"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'member', 'viewer']}>
              <ComingSoon title="Payroll Export" />
            </ProtectedRoute>
          }
        />
        {/* --- PERSONAL SETTINGS ROUTES --- */}
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'member', 'viewer']}>
              <SettingsLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirect /app/settings to /app/settings/profile */}
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<SettingsProfile />} />
          <Route path="attendance" element={<SettingsAttendance />} />
          <Route path="security" element={<SettingsSecurity />} />
        </Route>
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

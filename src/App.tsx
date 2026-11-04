import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom' // Standardized router import
import RouteSeo from './components/RouteSeo'
import { Toaster as Sonner } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth, AuthProvider } from './contexts/AuthContext'
const CheckIn = lazy(() => import('./pages/CheckIn'))
const Compliance = lazy(() => import('./pages/Compliance'))
const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'))
const LabourForecasting = lazy(() => import('./pages/LabourForecasting'))
const PayrollExport = lazy(() => import('./pages/PayrollExport'))
const SupportCenter = lazy(() => import('./pages/SupportCenter'))
const SafetyOps = lazy(() => import('./pages/SafetyOps'))
const GetStarted = lazy(() => import('./pages/GetStarted'))
const Index = lazy(() => import('./pages/Index'))
const Register = lazy(() => import('./pages/Register'))
const LiveAttendance = lazy(() => import('./pages/LiveAttendance'))
const Login = lazy(() => import('./pages/LoginPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Reports = lazy(() => import('./pages/Reports'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const InviteAccept = lazy(() => import('./pages/InviteAccept'))
const ContactUs = lazy(() => import('./pages/ContactUs'))
const Careers = lazy(() => import('./pages/Careers'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'))
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'))
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const Support = lazy(() => import('./pages/Support'))
const BecomePartner = lazy(() => import('./pages/BecomePartner'))
const SettingsLayout = lazy(() => import('./layouts/SettingsLayout'))
const SitesAndDepartments = lazy(() => import('./pages/SitesAndDepartments'))
const DashboardRouter = lazy(() => import('./pages/dashboard/DashboardRouter'))
const DashboardLoader = lazy(() =>
  import('./pages/dashboard/DashboardLoader').then((module) => ({
    default: module.DashboardLoader,
  }))
)
const SettingsProfile = lazy(() => import('./pages/settings/SettingsProfile'))
const SettingsAttendance = lazy(() => import('./pages/settings/SettingsAttendance'))
const SettingsSecurity = lazy(() => import('./pages/settings/SettingsSecurity'))
const WorkspaceGeneral = lazy(() => import('./pages/workspace/General'))
const WorkspaceBilling = lazy(() => import('./pages/workspace/Billing'))
const WorkspaceMembers = lazy(() => import('./pages/workspace/Members'))

const queryClient = new QueryClient()

// ── Marketing shell ──────────────────────────────────────────────────────────────
// Served at the root domain — public pages only, no authenticated routes.
const MarketingRoutes = () => (
  <Suspense fallback={<DashboardLoader />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/home" element={<Index />} />
      <Route path="/get-started" element={<GetStarted />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite/:token" element={<InviteAccept />} />
      <Route path="/invite/:token" element={<Navigate to="/accept-invite/:token" replace />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      <Route path="/support" element={<Support />} />
      <Route path="/partner" element={<BecomePartner />} />
      <Route path="/error" element={<NotFound />} />
    </Routes>
  </Suspense>
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
    <Suspense fallback={<DashboardLoader />}>
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Workspace default landing (DashboardRouter dynamically renders based on user.role) */}
          <Route index element={<DashboardRouter />} />
          {/* General Staff & Operator Views */}
          <Route
            path="check-in"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'member']}>
                <CheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="onboarding"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route path="reports" element={<Reports />} />
          {/* Management & Administration Views with RBAC */}
          <Route
            path="employees-management"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                <EmployeeManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="live-attendance"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                <LiveAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="compliance"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                <Compliance />
              </ProtectedRoute>
            }
          />
          <Route
            path="forecasting"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                <LabourForecasting />
              </ProtectedRoute>
            }
          />
          <Route
            path="sites"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'member']}>
                <SitesAndDepartments />
              </ProtectedRoute>
            }
          />
          <Route
            path="payroll"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                <PayrollExport />
              </ProtectedRoute>
            }
          />

          <Route
            path="support-center"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'member']}>
                <SupportCenter />
              </ProtectedRoute>
            }
          />

          <Route
            path="safety"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'member']}>
                <SafetyOps />
              </ProtectedRoute>
            }
          />

          <Route
            path="workspace/general"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <WorkspaceGeneral />
              </ProtectedRoute>
            }
          />

          <Route
            path="workspace/billing"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <WorkspaceBilling />
              </ProtectedRoute>
            }
          />

          <Route
            path="workspace/members"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
                <WorkspaceMembers />
              </ProtectedRoute>
            }
          />

          {/* --- PERSONAL SETTINGS ROUTES --- */}
          <Route
            path="settings"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'member']}>
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
    </Suspense>
  )
}

// ── App Root ──────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <RouteSeo />
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

import { useAuth } from '../../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { DashboardLoader } from './DashboardLoader'
import AdminDashboard from './AdminDashboard'
import ManagerDashboard from './ManagerDashboard'
import SupervisorDashboard from './SupervisorDashboard'
import EmployeeDashboard from './EmployeeDashboard'

const DashboardRouter = () => {
  const { user, tenant, isLoading, isAdmin } = useAuth()

  if (isLoading) return <DashboardLoader />

  // A tenant is fully onboarded and ready when its status is marked 'active'
  const isTenantSetupComplete = tenant?.status === 'active'

  // Redirect admin to onboarding if they haven't been assigned a tenant
  // or if that tenant's configuration status is not yet finalized ('active')
  if (isAdmin && (!user?.tenant_id || !isTenantSetupComplete)) {
    return <Navigate to="/app/onboarding" replace />
  }

  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />
    case 'manager':
      return <ManagerDashboard />
    case 'supervisor':
      return <SupervisorDashboard />
    case 'employee':
    default:
      return <EmployeeDashboard />
  }
}

export default DashboardRouter

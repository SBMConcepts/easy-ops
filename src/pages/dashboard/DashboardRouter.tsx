import { Navigate } from 'react-router-dom'
import { useAuth, useAuthRole } from '../../contexts/AuthContext'
import { DashboardLoader } from './DashboardLoader'
import AdminDashboard from './AdminDashboard'
import ManagerDashboard from './ManagerDashboard'
import SupervisorDashboard from './SupervisorDashboard'
import EmployeeDashboard from './EmployeeDashboard'

const DashboardRouter = () => {
  const { user, tenant, isLoading } = useAuth()
  const { isAdmin } = useAuthRole()

  if (isLoading) return <DashboardLoader />

  // A tenant is fully onboarded and ready when its status is marked 'active'[cite: 17]
  const isTenantSetupComplete = tenant?.status === 'active'

  // Redirect admin to onboarding if their identity hasn't resolved yet
  // or if that tenant's configuration status is not yet finalized ('active')[cite: 17]
  if (isAdmin && (!user?.id || !isTenantSetupComplete)) {
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

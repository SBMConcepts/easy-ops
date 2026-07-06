import { Navigate } from 'react-router-dom'
import { useAuth, useAuthRole } from '../../contexts/AuthContext'
import { DashboardLoader } from './DashboardLoader'
import AdminDashboard from './AdminDashboard'
import EmployeeDashboard from './EmployeeDashboard'
import ManagerDashboard from './ManagerDashboard'

const DashboardRouter = () => {
  const { user, organization, isLoading } = useAuth()
  const { isAdmin } = useAuthRole()

  if (isLoading) return <DashboardLoader />

  // An organization is fully onboarded and ready when its status is 'active'.
  const isOrgSetupComplete = organization?.status === 'active'

  // Redirect admin to onboarding if they haven't been assigned an organization
  // or if that organization's configuration status is not yet 'active'.
  if (isAdmin && (!user?.auth0_user_id || !isOrgSetupComplete)) {
    return <Navigate to="/app/onboarding" replace />
  }

  switch (user?.role) {
    case 'owner':
    case 'admin':
      return <AdminDashboard />
    case 'manager':
      return <ManagerDashboard />
    case 'member':
    default:
      return <EmployeeDashboard />
  }
}

export default DashboardRouter

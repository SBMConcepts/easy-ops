import { useAuth } from '../../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import ManagerDashboard from './ManagerDashboard'
import SupervisorDashboard from './SupervisorDashboard'
import EmployeeDashboard from './EmployeeDashboard'

const DashboardRouter = () => {
  const { user, onboardingComplete } = useAuth()

  // Redirect admin to onboarding if not completed and no org set
  if (user?.role === 'admin' && !onboardingComplete && !user.organisation_id) {
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

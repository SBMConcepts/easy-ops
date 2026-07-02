import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function AdminRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <Loader2 className="animate-spin h-8 w-8 mx-auto mt-10" />
  }

  // If not logged in, send to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If logged in but NOT an admin, redirect them back to their personal profile
  // Alternatively, you could redirect them to a dedicated "403 Forbidden" page
  if (user.role !== 'admin' && user.role !== 'owner') {
    return <Navigate to="/settings/profile" replace />
  }

  // If they are an admin, render the child routes
  return <Outlet />
}

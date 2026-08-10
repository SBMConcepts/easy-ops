import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, useAuthRole } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

/** Route guard: redirects unauthenticated users to /login, otherwise renders the nested route. */
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
  if (!['owner', 'admin'].includes(user.role)) {
    return <Navigate to="/settings/profile" replace />
  }

  // If they are an admin, render the child routes
  return <Outlet />
}

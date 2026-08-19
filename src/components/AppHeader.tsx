import { SidebarTrigger } from './ui/sidebar'
import { Separator } from './ui/separator'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from './ui/badge'
import { Avatar } from './ui/avatar'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../styles/appshell.css'

const roleBadgeColors: Record<string, string> = {
  owner: '!bg-emerald-500 text-emerald-50 border-emerald-500',
  admin: '!bg-destructive text-destructive border-destructive',
  manager: '!bg-secondary text-secondary border-secondary',
  member: '!bg-accent text-accent-foreground border-accent',
}

const AppHeader = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout() // Auth0 logout handles the redirect automatically
  }

  return (
    <header className="app-header">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="app-header-spacer" />
      {user && (
        <div className="app-header-right">
          <Badge className={roleBadgeColors[user.role]}>{user.role}</Badge>
          <div className="app-header-user">
            <Avatar
              src={user?.avatar_url}
              name={user?.full_name}
              className="h-7 w-7 text-[0.65rem]"
            />
            <span className="app-header-username">
              {user?.first_name} {user?.last_name}
            </span>
          </div>
          <button onClick={handleLogout} className="app-header-logout" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  )
}

export default AppHeader

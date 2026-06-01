import { SidebarTrigger } from './ui/sidebar'
import { Separator } from './ui/separator'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../styles/appshell.css'

const roleBadgeColors: Record<string, string> = {
  admin: '!bg-destructive text-destructive border-destructive',
  manager: '!bg-secondary text-secondary border-secondary',
  supervisor: '!bg-accent text-accent-foreground border-accent',
  employee: '!bg-primary text-primary border-primary',
}

const AppHeader = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="app-header-spacer" />
      {user && (
        <div className="app-header-right">
          <Badge className={roleBadgeColors[user.role] || ''}>{user.role}</Badge>
          <div className="app-header-user">
            <User className="h-4 w-4 icon-muted" style={{ color: 'var(--muted-foreground)' }} />
            <span className="app-header-username">{user.full_name || 'User Profile'}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Log Out">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      )}
    </header>
  )
}

export default AppHeader

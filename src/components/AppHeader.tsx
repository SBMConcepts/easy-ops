import { SidebarTrigger } from './ui/sidebar'
import { Separator } from './ui/separator'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../styles/appshell.css'

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-secondary/10 text-secondary border-secondary/20',
  supervisor: 'bg-accent/10 text-accent-foreground border-accent/20',
  employee: 'bg-primary/10 text-primary border-primary/20',
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
          <Badge variant="outline" className={roleBadgeColors[user.role]}>
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Badge>
          <div className="app-header-user">
            <User className="h-4 w-4 icon-muted" style={{ color: 'var(--muted-foreground)' }} />
            <span className="app-header-username">{user.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  )
}

export default AppHeader

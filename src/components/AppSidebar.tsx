import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from './ui/sidebar'
import {
  LayoutDashboard,
  QrCode,
  Users,
  FileText,
  Settings,
  Shield,
  Clock,
  Building,
  BarChart3,
  UserCheck,
} from 'lucide-react'
import '../styles/appshell.css'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  roles: string[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/app',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'supervisor', 'employee'],
  },
  {
    title: 'Check In / Out',
    url: '/app/check-in',
    icon: QrCode,
    roles: ['employee', 'supervisor'],
  },
  {
    title: 'Live Attendance',
    url: '/app/attendance',
    icon: Clock,
    roles: ['admin', 'manager', 'supervisor'],
  },
  { title: 'Reports', url: '/app/reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { title: 'Employee Management', url: '/app/employees', icon: Users, roles: ['admin', 'manager'] },
  { title: 'Team Overview', url: '/app/team', icon: UserCheck, roles: ['supervisor'] },
  {
    title: 'Sites & Departments',
    url: '/app/sites',
    icon: Building,
    roles: ['admin', 'manager', 'supervisor', 'employee'],
  },
  { title: 'Compliance & Audit', url: '/app/compliance', icon: Shield, roles: ['admin'] },
  { title: 'Payroll Export', url: '/app/payroll', icon: FileText, roles: ['admin', 'manager'] },
  {
    title: 'Settings',
    url: '/app/settings',
    icon: Settings,
    roles: ['admin', 'manager', 'supervisor', 'employee'],
  },
]

const AppSidebar = () => {
  const { user, organisation } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const filteredItems = navItems.filter((item) => user && item.roles.includes(user.role))

  const orgName = organisation?.name || 'EasyOps'

  return (
    <Sidebar className="sidebar-nav">
      <SidebarHeader className="sidebar-header">
        <div className="sidebar-brand" onClick={() => navigate('/app')}>
          <span className="sidebar-brand-name">{orgName}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="sidebar-group-label">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="sidebar-menu">
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.url} className="sidebar-menu-item">
                  <SidebarMenuButton
                    className={`sidebar-menu-button${location.pathname === item.url ? ' active' : ''}`}
                    isActive={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="sidebar-footer">
        <p className="sidebar-footer-text">{orgName} · Powered by EasyOps</p>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar

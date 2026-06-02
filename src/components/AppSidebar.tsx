import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../contexts/AuthContext'
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
  Settings,
  Shield,
  Building,
  BarChart3,
  UserCheck,
} from 'lucide-react'
import '../styles/appshell.css'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  roles: UserRole[]
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
    roles: ['employee', 'supervisor', 'manager', 'admin'],
  },
  {
    title: 'Live Attendance',
    url: '/app/live-attendance',
    icon: UserCheck,
    roles: ['admin', 'manager', 'supervisor'],
  },
  {
    title: 'Employees',
    url: '/app/employees',
    icon: Users,
    roles: ['admin', 'manager'],
  },
  {
    title: 'Sites & Depts',
    url: '/app/sites',
    icon: Building,
    roles: ['admin', 'manager', 'supervisor'],
  },
  {
    title: 'Compliance',
    url: '/app/compliance',
    icon: Shield,
    roles: ['admin', 'manager'],
  },
  {
    title: 'Reports',
    url: '/app/reports',
    icon: BarChart3,
    roles: ['admin', 'manager', 'supervisor', 'employee'],
  },
  {
    title: 'Settings',
    url: '/app/settings',
    icon: Settings,
    roles: ['admin', 'manager', 'supervisor', 'employee'],
  },
]

const AppSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, tenant } = useAuth()

  const orgName = tenant?.name

  const filteredItems = navItems.filter((item) => {
    if (!user) return false
    return item.roles.includes(user.role)
  })

  return (
    <Sidebar>
      <SidebarHeader className="sidebar-header">
        <div
          className="sidebar-brand"
          onClick={() => navigate('/app')}
          style={{ cursor: 'pointer' }}
        >
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

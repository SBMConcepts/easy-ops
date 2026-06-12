import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { TenantRole } from '../contexts/AuthContext'
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
import { LayoutDashboard, QrCode, Users, Settings, Shield, Building, BarChart3 } from 'lucide-react'
import '../styles/appshell.css'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  roles: TenantRole[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/app',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'supervisor', 'employee', 'owner'],
  },
  {
    title: 'Check In / Out',
    url: '/app/check-in',
    icon: QrCode,
    roles: ['employee', 'supervisor', 'manager', 'admin', 'owner'],
  },
  {
    title: 'Live Attendance',
    url: '/app/live-attendance',
    icon: BarChart3,
    roles: ['admin', 'manager', 'supervisor', 'owner'],
  },
  {
    title: 'Staff Directory',
    url: '/app/employees',
    icon: Users,
    roles: ['admin', 'manager', 'owner'],
  },
  {
    title: 'Sites & Depts',
    url: '/app/sites',
    icon: Building,
    roles: ['admin', 'manager', 'supervisor', 'owner'],
  },
  {
    title: 'Compliance',
    url: '/app/compliance',
    icon: Shield,
    roles: ['admin', 'manager', 'owner'],
  },
  {
    title: 'Settings',
    url: '/app/settings',
    icon: Settings,
    roles: ['admin', 'owner', 'supervisor', 'employee', 'manager'],
  },
]

const AppSidebar = () => {
  const { user, tenant } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const orgName = tenant?.name || tenant?.id || 'Your Organization'

  // Filter navigation items based on the user's role
  const filteredItems = navItems.filter((item) => user && item.roles.includes(user.role))

  return (
    <Sidebar className="app-sidebar">
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

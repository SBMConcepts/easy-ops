import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { OrgRole } from '../contexts/AuthContext'
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
  CreditCard,
} from 'lucide-react'
import '../styles/appshell.css'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  roles: OrgRole[]
  tooltip?: string
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/app',
    icon: LayoutDashboard,
    roles: ['owner', 'admin', 'member', 'viewer'],
    tooltip: 'View your dashboard and key metrics',
  },
  {
    title: 'Check In / Out',
    url: '/app/check-in',
    icon: QrCode,
    roles: ['owner', 'admin', 'member', 'viewer'],
    tooltip: 'Check in and out of work',
  },
  {
    title: 'Live Attendance',
    url: '/app/live-attendance',
    icon: BarChart3,
    roles: ['owner', 'admin', 'member'],
    tooltip: 'View live attendance data',
  },
  {
    title: 'Staff Directory',
    url: '/app/employees-management',
    icon: Users,
    roles: ['owner', 'admin'],
    tooltip: 'View and manage staff information',
  },
  {
    title: 'Sites & Depts',
    url: '/app/sites',
    icon: Building,
    roles: ['owner', 'admin', 'member'],
    tooltip: 'Manage sites and departments',
  },
  //  Workspace General Settings
  {
    title: 'Workspace Settings',
    url: '/app/workspace/general',
    icon: Building,
    roles: ['owner', 'admin'],
    tooltip: 'Manage company profile and general settings',
  },

  //  Members (If replacing Employee Management, just update the URL of the existing one)
  {
    title: 'Team Members',
    url: '/app/workspace/members',
    icon: Users,
    roles: ['owner', 'admin'],
    tooltip: 'Manage users, invites, and roles',
  },

  //  Billing
  {
    title: 'Billing & Plan',
    url: '/app/workspace/billing',
    icon: CreditCard,
    roles: ['owner'], // Often, only 'owner' handles billing, but you can add 'admin' if desired
    tooltip: 'Manage subscription and invoices',
  },
  {
    title: 'Compliance',
    url: '/app/compliance',
    icon: Shield,
    roles: ['owner', 'admin'],
    tooltip: 'Manage compliance settings',
  },
  {
    title: 'Settings',
    url: '/app/settings',
    icon: Settings,
    roles: ['owner', 'admin', 'member', 'viewer'],
    tooltip: 'Manage User settings',
  },
]

const AppSidebar = () => {
  const { user, organization } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const orgName = organization?.name

  // Filter navigation items based on the user's role
  const filteredItems = navItems.filter((item) => item.roles.includes(user?.role))

  return (
    <Sidebar className="sidebar-nav">
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
                    tooltip={{ children: item.tooltip, side: 'right' }}
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

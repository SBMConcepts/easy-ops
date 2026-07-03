import React, { useState } from 'react'
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
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
  ChevronRight,
} from 'lucide-react'

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

// Organisation / Workspace administration — grouped under a collapsible section.
const workspaceItems: NavItem[] = [
  {
    title: 'Workspace Settings',
    url: '/app/workspace/general',
    icon: Building,
    roles: ['owner', 'admin'],
    tooltip: 'Manage company profile and general settings',
  },
  {
    title: 'Team Members',
    url: '/app/workspace/members',
    icon: Users,
    roles: ['owner', 'admin'],
    tooltip: 'Manage users, invites, and roles',
  },
  {
    title: 'Billing & Plan',
    url: '/app/workspace/billing',
    icon: CreditCard,
    roles: ['owner', 'admin'], // Often, only 'owner' handles billing, but you can add 'admin' if desired
    tooltip: 'Manage subscription and invoices',
  },
]

const AppSidebar = () => {
  const { user, organization } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const orgName = organization?.name ?? 'EasyOps'
  const role = user?.role

  // Filter navigation items based on the user's role.
  const filteredItems = navItems.filter((item) => !!role && item.roles.includes(role))
  const filteredWorkspaceItems = workspaceItems.filter(
    (item) => !!role && item.roles.includes(role)
  )

  // Keep the organisation group expanded when the user is inside one of its routes.
  const isWorkspaceRoute = workspaceItems.some((item) => location.pathname.startsWith(item.url))
  const [workspaceOpen, setWorkspaceOpen] = useState(isWorkspaceRoute)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={orgName}
              onClick={() => navigate('/app')}
              className="data-active:bg-transparent"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building className="size-4" />
              </div>
              <span className="truncate text-base font-bold">{orgName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                    tooltip={item.tooltip ?? item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {filteredWorkspaceItems.length > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isWorkspaceRoute}
                    onClick={() => setWorkspaceOpen((open) => !open)}
                    tooltip="Organisation settings"
                  >
                    <Building className="h-4 w-4" />
                    <span>Organisation Settings</span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${
                        workspaceOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </SidebarMenuButton>

                  {workspaceOpen && (
                    <SidebarMenuSub>
                      {filteredWorkspaceItems.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton
                            isActive={location.pathname === item.url}
                            onClick={() => navigate(item.url)}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          {orgName} · Powered by EasyOps
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar

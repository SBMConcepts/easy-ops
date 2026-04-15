import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
} from "./ui/sidebar";
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
} from "lucide-react";
import logo from "@/assets/logo.png";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/app",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "supervisor", "employee"],
  },
  {
    title: "Check In / Out",
    url: "/app/check-in",
    icon: QrCode,
    roles: ["employee", "supervisor"],
  },
  {
    title: "Live Attendance",
    url: "/app/attendance",
    icon: Clock,
    roles: ["admin", "manager", "supervisor"],
  },
  {
    title: "Reports",
    url: "/app/reports",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
  {
    title: "Employee Management",
    url: "/app/employees",
    icon: Users,
    roles: ["admin", "manager"],
  },
  {
    title: "Team Overview",
    url: "/app/team",
    icon: UserCheck,
    roles: ["supervisor"],
  },
  {
    title: "Sites & Departments",
    url: "/app/sites",
    icon: Building,
    roles: ["admin"],
  },
  {
    title: "Compliance & Audit",
    url: "/app/compliance",
    icon: Shield,
    roles: ["admin"],
  },
  {
    title: "Payroll Export",
    url: "/app/payroll",
    icon: FileText,
    roles: ["admin", "manager"],
  },
  { title: "Settings", url: "/app/settings", icon: Settings, roles: ["admin"] },
];

const AppSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/app")}
        >
          <img src={logo} alt="EazyOps" className="h-8 w-8 rounded" />
          <span className="font-display text-lg font-bold text-foreground">
            EazyOps
          </span>
        </div>
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
      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground">
          EazyOps v1.0 · Prototype
        </p>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;

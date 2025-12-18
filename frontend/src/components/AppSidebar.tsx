import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ChevronUp,
  Home,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Building2,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth, useTheme } from "@/contexts";
import { logout } from "@/api/auth";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Incidents",
    url: "/incidents",
    icon: AlertTriangle,
  },
  {
    title: "Teams",
    url: "/teams",
    icon: Building2,
  },
  {
    title: "Admin",
    url: "/admin",
    icon: Shield,
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  const getThemeIcon = () => {
    if (theme === "system") return <Monitor className="mr-2 h-4 w-4" />;
    if (theme === "light") return <Sun className="mr-2 h-4 w-4" />;
    return <Moon className="mr-2 h-4 w-4" />;
  };

  const getThemeLabel = () => {
    if (theme === "system") return "System";
    if (theme === "light") return "Light";
    return "Dark";
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Continue with logout even if API fails
    }
    setUser(null);
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Incident Manager</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <a
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.url);
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left truncate">
                    {user?.name || "User"}
                  </span>
                  <ChevronUp className="h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {user?.email}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={cycleTheme}>
                  {getThemeIcon()}
                  Theme: {getThemeLabel()}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;

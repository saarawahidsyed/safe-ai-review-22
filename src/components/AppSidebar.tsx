import { Activity, AlertTriangle, FileSearch, LayoutDashboard, LogOut, Microscope, Settings, Shield, ShieldCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const main = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Signal Detection", url: "/signals", icon: Activity },
  { title: "Case Review", url: "/cases", icon: FileSearch },
  { title: "Adverse Events", url: "/events", icon: AlertTriangle },
];
const tools = [
  { title: "Model Explainability", url: "/xai", icon: Microscope },
  { title: "Audit & Compliance", url: "/audit", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, roles, signOut, hasRole } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-4 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary/15 grid place-items-center">
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-sidebar-foreground">PV-XAI</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Pharmacovigilance</div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Analysis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {hasRole("admin") && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && !collapsed && (
          <div className="mt-auto px-3 py-3 border-t border-sidebar-border space-y-2">
            <div className="text-[11px] text-sidebar-foreground/70 truncate">{user.email}</div>
            <div className="flex flex-wrap gap-1">
              {roles.length === 0 ? (
                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">No roles</span>
              ) : (
                roles.map((r) => (
                  <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/80 uppercase tracking-wider">
                    {r.replace("_", " ")}
                  </span>
                ))
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8" onClick={() => signOut()}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

import { NavLink, useLocation, matchPath } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  PlusCircle,
  Puzzle,
  Users,
  ShieldCheck,
  ScrollText,
  Settings,
  ChevronLeft,
  Gauge,
  SquareTerminal,
  FolderOpen,
  Blocks,
  UsersRound,
  SlidersHorizontal,
  Archive,
} from "lucide-react";
import type { Permission } from "@minecraftpanel/shared";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";

const SERVER_NAV_ITEMS = [
  { to: "overview", label: "Overview", icon: Gauge },
  { to: "console", label: "Console", icon: SquareTerminal },
  { to: "files", label: "Files", icon: FolderOpen },
  { to: "plugins", label: "Plugins/Mods", icon: Blocks },
  { to: "players", label: "Players", icon: UsersRound },
  { to: "backups", label: "Backups", icon: Archive },
  { to: "settings", label: "Settings", icon: SlidersHorizontal },
];

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  /** Hidden unless the user holds this global permission (Owner always sees everything). */
  permission?: Permission;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  {
    title: "Servers",
    items: [
      { to: "/servers", label: "All Servers", icon: Server, end: true, permission: "servers.view" },
      { to: "/servers/new", label: "Create Server", icon: PlusCircle, permission: "servers.create" },
    ],
  },
  {
    title: "Tools",
    items: [{ to: "/modrinth", label: "Modrinth", icon: Puzzle, permission: "plugins.view" }],
  },
  {
    title: "Admin",
    items: [
      { to: "/admin/users", label: "Users", icon: Users, permission: "users.view" },
      { to: "/admin/roles", label: "Roles", icon: ShieldCheck, permission: "roles.view" },
      { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText, permission: "audit.view" },
    ],
  },
  {
    title: "System",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { hasPermission } = useAuth();
  const location = useLocation();

  // "/servers/new" also matches this splat pattern (id="new") — excluded
  // explicitly since that's the creation wizard, not an existing server.
  const serverMatch = matchPath("/servers/:id/*", location.pathname);
  const serverId = serverMatch && serverMatch.params.id !== "new" ? serverMatch.params.id : undefined;

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-64",
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <Logo className="h-7 w-7 shrink-0" />
        <span className="text-sm font-semibold tracking-tight">
          minecraft<span className="font-bold text-primary">panel</span>
        </span>
      </div>

      {serverId ? (
        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin">
          <NavLink
            to="/servers"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> All Servers
          </NavLink>

          <div>
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Server</p>
            <div className="space-y-0.5">
              {SERVER_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={`/servers/${serverId}/${item.to}`}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      ) : (
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3 scrollbar-thin">
          {visibleSections.map((section, i) => (
            <div key={i}>
              {section.title && (
                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      )}
    </aside>
  );
}

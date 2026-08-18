import { useState } from "react";
import { Link, NavLink, useLocation, matchPath } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  PlusCircle,
  Puzzle,
  Users,
  ShieldCheck,
  ScrollText,
  Settings,
  Gauge,
  SquareTerminal,
  FolderOpen,
  Blocks,
  UsersRound,
  SlidersHorizontal,
  Archive,
  CalendarClock,
  Network,
  ChevronRight,
} from "lucide-react";
import type { Permission } from "@minecraftpanel/shared";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useServers } from "@/lib/servers";
import { StatusDot } from "@/components/servers/StatusBadge";
import { Logo } from "./Logo";

const SERVER_NAV_SECTIONS: { title: string; items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    title: "Monitor",
    items: [
      { to: "overview", label: "Overview", icon: Gauge },
      { to: "console", label: "Console", icon: SquareTerminal },
    ],
  },
  {
    title: "Manage",
    items: [
      { to: "files", label: "Files", icon: FolderOpen },
      { to: "plugins", label: "Plugins/Mods", icon: Blocks },
      { to: "players", label: "Players", icon: UsersRound },
    ],
  },
  {
    title: "Automation",
    items: [
      { to: "backups", label: "Backups", icon: Archive },
      { to: "scheduler", label: "Scheduler", icon: CalendarClock },
    ],
  },
  {
    title: "Configuration",
    items: [{ to: "settings", label: "Settings", icon: SlidersHorizontal }],
  },
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
      { to: "/servers/allocations", label: "Allocations", icon: Network, permission: "servers.view" },
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

  // "/servers/new" and "/servers/allocations" also match this splat pattern
  // (id="new"/"allocations") — excluded explicitly since those are the
  // creation wizard and the allocations page, not an existing server.
  const serverMatch = matchPath("/servers/:id/*", location.pathname);
  const serverId =
    serverMatch && serverMatch.params.id !== "new" && serverMatch.params.id !== "allocations" ? serverMatch.params.id : undefined;

  const [allServersOpen, setAllServersOpen] = useState(() => Boolean(serverId));
  const { data } = useServers();
  const servers = data?.servers ?? [];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  const canViewServers = hasPermission("servers.view");

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-64",
      )}
    >
      <Link to="/" className="flex h-14 shrink-0 items-center gap-2 px-4 hover:bg-accent/50">
        <Logo className="h-7 w-7 shrink-0" />
        <span className="text-sm font-semibold tracking-tight">
          mine<span className="font-bold text-primary">controller</span>
        </span>
      </Link>

      {serverId ? (
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3 scrollbar-thin">
          {SERVER_NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
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
          ))}
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
                {section.title === "Servers" && canViewServers && (
                  <div>
                    <button
                      type="button"
                      aria-expanded={allServersOpen}
                      onClick={() => setAllServersOpen((v) => !v)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Server className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate text-left">All Servers</span>
                      <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform", allServersOpen && "rotate-90")} />
                    </button>

                    {allServersOpen && servers.length > 0 && (
                      <div className="ml-4 space-y-0.5 border-l border-border pl-2.5">
                        {servers.map((server) => (
                          <NavLink
                            key={server.id}
                            to={`/servers/${server.id}`}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                isActive
                                  ? "bg-primary/15 font-medium text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              )
                            }
                          >
                            <StatusDot status={server.status} />
                            <span className="truncate">{server.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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

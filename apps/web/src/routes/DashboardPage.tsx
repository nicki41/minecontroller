import { Link } from "react-router-dom";
import { Server as ServerIcon, PlusCircle, Activity, Users, Cpu } from "lucide-react";
import { useServers } from "@/lib/servers";
import { ServerCard } from "@/components/servers/ServerCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-none">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useServers();
  const { user, hasPermission } = useAuth();
  const servers = data?.servers ?? [];
  const online = servers.filter((s) => s.status === "RUNNING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {user ? `, ${user.username}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your servers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={ServerIcon} label="Servers" value={servers.length} />
        <SummaryCard icon={Activity} label="Online" value={online} />
        <SummaryCard icon={Users} label="Players" value="—" />
        <SummaryCard icon={Cpu} label="Avg CPU" value="—" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Your servers</h2>
        {hasPermission("servers.create") && (
          <Button asChild size="sm" variant="outline">
            <Link to="/servers/new">
              <PlusCircle /> Create Server
            </Link>
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!isLoading && servers.length === 0 && (
        <EmptyState
          icon={ServerIcon}
          title="No servers yet"
          description="Create your first Minecraft server to get started."
          action={
            hasPermission("servers.create") ? (
              <Button asChild size="sm">
                <Link to="/servers/new">
                  <PlusCircle /> Create Server
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && servers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}

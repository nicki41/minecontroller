import { Link } from "react-router-dom";
import { Server as ServerIcon, PlusCircle } from "lucide-react";
import { useServers } from "@/lib/servers";
import { ServerCard } from "@/components/servers/ServerCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function ServersListPage() {
  const { data, isLoading } = useServers();
  const { hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All Servers</h1>
          <p className="text-sm text-muted-foreground">Every Minecraft server you have access to.</p>
        </div>
        {hasPermission("servers.create") && (
          <Button asChild>
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

      {!isLoading && (data?.servers.length ?? 0) === 0 && (
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

      {!isLoading && (data?.servers.length ?? 0) > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.servers.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}

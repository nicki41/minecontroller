import { Link } from "react-router-dom";
import type { ServerDto } from "@minecraftpanel/shared";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusLabel } from "./StatusBadge";
import { SOFTWARE_META } from "@/lib/softwareMeta";
import { formatMb } from "@/lib/format";
import { useServerAction } from "@/lib/servers";

export function ServerCard({ server }: { server: ServerDto }) {
  const start = useServerAction(server.id, "start");
  const canStart = server.status === "STOPPED" || server.status === "ERROR";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/servers/${server.id}`} className="truncate text-sm font-semibold hover:underline">
              {server.name}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {SOFTWARE_META[server.software].label} {server.mcVersion}
            </p>
          </div>
          <StatusLabel status={server.status} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-1.5 pb-3 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>RAM limit</span>
          <span className="font-medium text-foreground">{formatMb(server.memoryMb)}</span>
        </div>
        <div className="flex justify-between">
          <span>Port</span>
          <span className="font-medium text-foreground">{server.port}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {canStart ? (
          <Button size="sm" className="flex-1" onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending ? "Starting..." : "Start"}
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to={`/servers/${server.id}`}>Open Server</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

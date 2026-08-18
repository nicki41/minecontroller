import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Radio, Clock, Users } from "lucide-react";
import type { ServerDto } from "@minecraftpanel/shared";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusLabel } from "./StatusBadge";
import { Sparkline } from "./Sparkline";
import { SOFTWARE_META } from "@/lib/softwareMeta";
import { useServerAction, useServerStats } from "@/lib/servers";
import { usePlayers } from "@/lib/players";
import { useServerConfigFile } from "@/lib/serverConfig";
import { useMetricsHistory } from "@/lib/metricsHistory";
import { usePublicIp } from "@/lib/system";
import { formatUptime } from "@/lib/uptime";

const CPU_COLOR = "hsl(var(--primary))";

export function ServerCard({ server }: { server: ServerDto }) {
  const start = useServerAction(server.id, "start");
  const canStart = server.status === "STOPPED" || server.status === "ERROR";
  const isRunning = server.status === "RUNNING";

  const stats = useServerStats(server.id, isRunning);
  const players = usePlayers(server.id);
  const properties = useServerConfigFile(server.id, "server-properties");
  const publicIp = usePublicIp();
  const history = useMetricsHistory(server.id, "15m", isRunning);

  const maxPlayers = properties.data?.values["max-players"];
  const onlineCount = players.data?.players.filter((p) => p.online).length ?? 0;

  const cpuSeries = useMemo(
    () => (history.data?.samples ?? []).map((s) => ({ timestamp: s.timestamp, value: s.cpuPercent })),
    [history.data],
  );

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
      <CardContent className="flex-1 space-y-2.5 pb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium text-foreground">
            {publicIp.data?.publicIp ? `${publicIp.data.publicIp}:${server.port}` : `Port ${server.port}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-foreground">{isRunning ? formatUptime(stats.data?.startedAt ?? null) : "Offline"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-foreground">
            {isRunning ? onlineCount : "—"} / {typeof maxPlayers === "number" ? maxPlayers : "—"}
          </span>
        </div>
        <Sparkline data={cpuSeries} color={CPU_COLOR} />
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

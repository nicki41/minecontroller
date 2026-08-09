import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import type { PlayerDto, PlayerGamemode } from "@minecraftpanel/shared";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGamemode } from "@/lib/playerDetails";
import { formatJoinDate } from "@/lib/playerFormat";
import { useCopyField } from "../useCopyField";
import type { PlayerActionHandlers } from "../playerActions";

const GAMEMODES: PlayerGamemode[] = ["SURVIVAL", "CREATIVE", "ADVENTURE", "SPECTATOR"];
const GAMEMODE_LABEL: Record<PlayerGamemode, string> = {
  SURVIVAL: "Survival",
  CREATIVE: "Creative",
  ADVENTURE: "Adventure",
  SPECTATOR: "Spectator",
};

interface PlayerGeneralTabProps {
  player: PlayerDto;
  serverId: string;
  actions: PlayerActionHandlers;
}

export function PlayerGeneralTab({ player: p, serverId, actions }: PlayerGeneralTabProps) {
  const { copiedField, copy } = useCopyField();
  const [showIp, setShowIp] = useState(false);
  const { data: gamemodeData, isLoading: gamemodeLoading } = useGamemode(serverId, p.username);

  const statusText = p.banned ? "Banned" : p.online ? "Online" : "Offline";
  const statusTextColor = p.banned ? "text-status-error" : p.online ? "text-status-online" : "text-status-offline";
  const statusDotColor = p.banned ? "bg-status-error" : p.online ? "bg-status-online" : "bg-status-offline";
  const statusBg = p.banned ? "bg-status-error/15" : p.online ? "bg-status-online/15" : "bg-status-offline/15";

  function handleGamemodeChange(mode: string) {
    actions.onSetGamemode(p.username, mode as PlayerGamemode);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">{p.uuid ?? "Unknown UUID"}</span>
        {p.uuid && (
          <button onClick={() => copy("uuid", p.uuid!)} className="text-muted-foreground hover:text-foreground" title="Copy UUID">
            {copiedField === "uuid" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBg} ${statusTextColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`} />
          {statusText}
        </span>
        {p.whitelisted && (
          <Badge variant="outline" className="border-transparent bg-amber-500/15 text-amber-500">
            Whitelisted
          </Badge>
        )}
        {p.op && (
          <Badge variant="outline" className="border-transparent bg-violet-500/15 text-violet-400">
            Operator
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Joined</div>
          <div className="mt-0.5 text-sm font-medium">{formatJoinDate(p.firstSeenAt)}</div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Gamemode</div>
          {actions.canOp && p.online ? (
            <Select value={gamemodeData?.gamemode ?? undefined} onValueChange={handleGamemodeChange}>
              <SelectTrigger className="mt-0.5 h-7 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0">
                <SelectValue placeholder={gamemodeLoading ? "Loading…" : "Unknown"} />
              </SelectTrigger>
              <SelectContent>
                {GAMEMODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {GAMEMODE_LABEL[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-0.5 text-sm font-medium">
              {gamemodeLoading ? "Loading…" : gamemodeData?.gamemode ? GAMEMODE_LABEL[gamemodeData.gamemode] : "Unknown"}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">IP address</div>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-medium">{!p.lastIp ? "Unknown" : showIp ? p.lastIp : "•••.•••.•••.•••"}</span>
            {p.lastIp && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setShowIp((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                  title={showIp ? "Hide IP" : "Show IP"}
                >
                  {showIp ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => copy("ip", p.lastIp!)} className="text-muted-foreground hover:text-foreground" title="Copy IP">
                  {copiedField === "ip" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5" title="Not exposed by RCON or the vanilla server log — would need a server-side plugin to read.">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Client / Protocol</div>
          <div className="mt-0.5 text-sm font-medium text-muted-foreground">Not available</div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5" title="Not exposed by RCON or the vanilla server log — would need a server-side plugin to read.">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Ping</div>
          <div className="mt-0.5 text-sm font-medium text-muted-foreground">Not available</div>
        </div>
      </div>
    </div>
  );
}

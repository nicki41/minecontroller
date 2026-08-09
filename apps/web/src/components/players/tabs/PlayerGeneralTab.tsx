import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import type { PlayerDto } from "@minecraftpanel/shared";
import { Badge } from "@/components/ui/badge";
import { formatJoinDate } from "@/lib/playerFormat";
import { useCopyField } from "../useCopyField";

interface PlayerGeneralTabProps {
  player: PlayerDto;
}

export function PlayerGeneralTab({ player: p }: PlayerGeneralTabProps) {
  const { copiedField, copy } = useCopyField();
  const [showIp, setShowIp] = useState(false);

  const statusText = p.banned ? "Banned" : p.online ? "Online" : "Offline";
  const statusTextColor = p.banned ? "text-status-error" : p.online ? "text-status-online" : "text-status-offline";
  const statusDotColor = p.banned ? "bg-status-error" : p.online ? "bg-status-online" : "bg-status-offline";
  const statusBg = p.banned ? "bg-status-error/15" : p.online ? "bg-status-online/15" : "bg-status-offline/15";

  return (
    <div className="space-y-5">
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
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">IP address</div>
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
      </div>
    </div>
  );
}

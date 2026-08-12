import { useState } from "react";
import { Box } from "lucide-react";
import { serverIconUrl, useServerIconVersion } from "@/lib/serverIcon";
import { MotdLines } from "./MotdPreview";

/**
 * Mimics a row in Minecraft's multiplayer server list (icon, MOTD, player
 * count) so icon/MOTD/slot changes above are easy to sanity-check together
 * before saving, instead of only as separate isolated fields. `name` is
 * included for identification in the panel even though a real Minecraft
 * client actually labels list entries with its own local bookmark name
 * rather than anything the server sends — this is a panel-side summary
 * card, not a pixel-exact recreation of the client widget.
 */
export function ServerListPreview({
  serverId,
  name,
  motd,
  maxPlayers,
  onlineCount = 0,
}: {
  serverId: string;
  name: string;
  motd: string;
  maxPlayers: string | number;
  onlineCount?: number;
}) {
  const { version } = useServerIconVersion(serverId);
  const [hasIcon, setHasIcon] = useState<boolean | null>(null);
  const slots = maxPlayers === "" || maxPlayers === null || maxPlayers === undefined ? "?" : maxPlayers;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Multiplayer list preview</p>
      <div className="flex items-center gap-3 rounded-md border border-border bg-[#2b2b2b] p-2.5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-black/20">
          {hasIcon !== false && (
            <img
              key={version}
              src={serverIconUrl(serverId, version)}
              alt=""
              className="h-full w-full [image-rendering:pixelated]"
              onLoad={() => setHasIcon(true)}
              onError={() => setHasIcon(false)}
            />
          )}
          {hasIcon === false && <Box className="h-7 w-7 text-white/30" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-white" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.6)" }}>
              {name}
            </span>
            <span className="shrink-0 text-xs text-[#aaaaaa]">
              {onlineCount}/{slots}
            </span>
          </div>
          <MotdLines motd={motd} className="mt-0.5 text-xs leading-snug" />
        </div>
      </div>
    </div>
  );
}

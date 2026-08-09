import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Info, Search, Users } from "lucide-react";
import type { PlayerDto } from "@minecraftpanel/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  usePlayers,
  useOpPlayer,
  useDeopPlayer,
  useWhitelistAddPlayer,
  useWhitelistRemovePlayer,
  useKickPlayer,
  useBanPlayer,
  useUnbanPlayer,
  useMessagePlayer,
} from "@/lib/players";
import { useIpBan, useIpUnban, useSetGamemode, useTempBan, useWipe } from "@/lib/playerDetails";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerDetailModal } from "@/components/players/PlayerDetailModal";
import type { PlayerActionHandlers } from "@/components/players/playerActions";
import { useServerOutletContext } from "./useServerOutletContext";

type FilterKey = "all" | "online" | "offline" | "banned" | "whitelisted" | "op";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
  { key: "banned", label: "Banned" },
  { key: "whitelisted", label: "Whitelisted" },
  { key: "op", label: "OP" },
];

export default function ServerPlayersPage() {
  const { server } = useServerOutletContext();
  const { hasPermission } = useAuth();
  const { data, isLoading } = usePlayers(server.id);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<{ username: string; compose: boolean } | null>(null);

  const isRunning = server.status === "RUNNING";
  const hasFullAccess = server.myAccessLevel === "FULL";
  const canOp = hasFullAccess && hasPermission("players.op");
  const canWhitelist = hasFullAccess && hasPermission("players.whitelist");
  const canKick = hasFullAccess && hasPermission("players.kick");
  const canBan = hasFullAccess && hasPermission("players.ban");
  const canMessage = hasFullAccess && hasPermission("players.message");
  const canWipe = hasFullAccess && hasPermission("players.wipe");

  const op = useOpPlayer(server.id);
  const deop = useDeopPlayer(server.id);
  const whitelistAdd = useWhitelistAddPlayer(server.id);
  const whitelistRemove = useWhitelistRemovePlayer(server.id);
  const kick = useKickPlayer(server.id);
  const ban = useBanPlayer(server.id);
  const unban = useUnbanPlayer(server.id);
  const message = useMessagePlayer(server.id);
  const tempBan = useTempBan(server.id);
  const ipBan = useIpBan(server.id);
  const ipUnban = useIpUnban(server.id);
  const wipe = useWipe(server.id);
  const setGamemode = useSetGamemode(server.id);

  async function run<TVars extends { username: string }>(action: { mutateAsync: (v: TVars) => Promise<unknown> }, vars: TVars, label: string) {
    try {
      await action.mutateAsync(vars);
      toast.success(`${label} ${vars.username}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to ${label.toLowerCase()} ${vars.username}.`);
    }
  }

  async function handleSendMessage(username: string, text: string) {
    try {
      await message.mutateAsync({ username, message: text });
      toast.success(`Message sent to ${username}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to message ${username}.`);
    }
  }

  const actions: PlayerActionHandlers = {
    canKick,
    canBan,
    canWhitelist,
    canOp,
    canMessage,
    canWipe,
    onKick: (username, reason) => void run(kick, { username, reason }, "Kicked"),
    onBan: (username, reason) => void run(ban, { username, reason }, "Banned"),
    onUnban: (username) => void run(unban, { username }, "Unbanned"),
    onWhitelistAdd: (username) => void run(whitelistAdd, { username }, "Whitelisted"),
    onWhitelistRemove: (username) => void run(whitelistRemove, { username }, "Removed from whitelist"),
    onOp: (username) => void run(op, { username }, "Opped"),
    onDeop: (username) => void run(deop, { username }, "De-opped"),
    onOpenDetail: (username) => setSelected({ username, compose: false }),
    onOpenMessage: (username) => setSelected({ username, compose: true }),
    onTempBan: (username, durationMinutes, reason) => void run(tempBan, { username, durationMinutes, reason }, "Temporarily banned"),
    onIpBan: (username, ip, reason) => void run(ipBan, { username, ip, reason }, "Banned IP for"),
    onIpUnban: (username, ip) => void run(ipUnban, { username, ip }, "Removed IP ban for"),
    onWipe: (username) => void run(wipe, { username }, "Wiped data for"),
    onSetGamemode: (username, mode) => void run(setGamemode, { username, mode }, "Changed gamemode for"),
  };

  const players = data?.players ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return players
      .filter((p) => !term || p.username.toLowerCase().includes(term))
      .filter((p) => {
        switch (filter) {
          case "online":
            return p.online && !p.banned;
          case "offline":
            return !p.online && !p.banned;
          case "banned":
            return p.banned;
          case "whitelisted":
            return p.whitelisted;
          case "op":
            return p.op;
          default:
            return true;
        }
      })
      .sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
  }, [players, search, filter]);

  const onlineCount = players.filter((p) => p.online && !p.banned).length;
  const selectedPlayer: PlayerDto | null = selected ? (players.find((p) => p.username === selected.username) ?? null) : null;

  return (
    <div className="space-y-4">
      {!isRunning && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          Start the server to manage players — actions run as live commands against the running server.
        </div>
      )}

      <div className="flex items-end justify-between gap-4">
        <h1 className="text-lg font-semibold">Players</h1>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-xl font-bold text-primary">{onlineCount}</div>
            <div className="text-xs text-muted-foreground">Online</div>
          </div>
          <div className="w-px bg-border" />
          <div>
            <div className="text-xl font-bold">{players.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}

      {!isLoading && players.length === 0 && (
        <EmptyState icon={Users} title="No known players" description="Players appear here once they join or are whitelisted/opped." />
      )}

      {!isLoading && players.length > 0 && filtered.length === 0 && (
        <EmptyState icon={Search} title="No matching players" description="Try a different search term or filter." />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <PlayerCard key={p.username} player={p} actions={actions} />
          ))}
        </div>
      )}

      {selected && (
        <PlayerDetailModal
          player={selectedPlayer}
          serverId={server.id}
          actions={actions}
          initialCompose={selected.compose}
          onClose={() => setSelected(null)}
          onSendMessage={handleSendMessage}
          sending={message.isPending}
        />
      )}
    </div>
  );
}

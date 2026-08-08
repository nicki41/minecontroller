import { useState } from "react";
import { toast } from "sonner";
import { Users, ShieldCheck, ShieldOff, ListPlus, ListX, LogOut, Ban, ShieldX, MoreHorizontal, Info, UserPlus } from "lucide-react";
import type { PlayerDto } from "@minecraftpanel/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
} from "@/lib/players";
import { useServerOutletContext } from "./useServerOutletContext";

export default function ServerPlayersPage() {
  const { server } = useServerOutletContext();
  const { hasPermission } = useAuth();
  const { data, isLoading } = usePlayers(server.id);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");

  const isRunning = server.status === "RUNNING";
  const canOp = hasPermission("players.op");
  const canWhitelist = hasPermission("players.whitelist");
  const canKick = hasPermission("players.kick");
  const canBan = hasPermission("players.ban");

  const op = useOpPlayer(server.id);
  const deop = useDeopPlayer(server.id);
  const whitelistAdd = useWhitelistAddPlayer(server.id);
  const whitelistRemove = useWhitelistRemovePlayer(server.id);
  const kick = useKickPlayer(server.id);
  const ban = useBanPlayer(server.id);
  const unban = useUnbanPlayer(server.id);

  async function run(action: { mutateAsync: (v: { username: string }) => Promise<unknown> }, username: string, label: string) {
    try {
      await action.mutateAsync({ username });
      toast.success(`${label} ${username}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to ${label.toLowerCase()} ${username}.`);
    }
  }

  async function handleAddToWhitelist() {
    if (!addName.trim()) return;
    await run(whitelistAdd, addName.trim(), "Whitelisted");
    setAddOpen(false);
    setAddName("");
  }

  const players = data?.players ?? [];

  return (
    <div className="space-y-4">
      {!isRunning && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          Start the server to manage players — actions run as live commands against the running server.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Players</h1>
        {canWhitelist && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} disabled={!isRunning}>
            <UserPlus className="h-3.5 w-3.5" /> Add to whitelist
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}

      {!isLoading && players.length === 0 && (
        <EmptyState icon={Users} title="No known players" description="Players appear here once they join or are whitelisted/opped." />
      )}

      {!isLoading && players.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p: PlayerDto) => (
                <TableRow key={p.username}>
                  <TableCell className="flex items-center gap-2 font-medium">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${p.online ? "bg-status-online" : "bg-status-offline"}`} />
                    {p.username}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.uuid ?? "—"}</TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    {p.op && <Badge variant="secondary">OP</Badge>}
                    {p.whitelisted && <Badge variant="secondary">Whitelisted</Badge>}
                    {p.banned && <Badge variant="destructive">Banned</Badge>}
                    {!p.op && !p.whitelisted && !p.banned && <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!isRunning}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canOp &&
                          (p.op ? (
                            <DropdownMenuItem onClick={() => run(deop, p.username, "De-opped")}>
                              <ShieldOff /> Remove OP
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => run(op, p.username, "Opped")}>
                              <ShieldCheck /> Make OP
                            </DropdownMenuItem>
                          ))}
                        {canWhitelist &&
                          (p.whitelisted ? (
                            <DropdownMenuItem onClick={() => run(whitelistRemove, p.username, "Removed from whitelist")}>
                              <ListX /> Remove from whitelist
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => run(whitelistAdd, p.username, "Whitelisted")}>
                              <ListPlus /> Add to whitelist
                            </DropdownMenuItem>
                          ))}
                        {canKick && p.online && (
                          <DropdownMenuItem onClick={() => run(kick, p.username, "Kicked")}>
                            <LogOut /> Kick
                          </DropdownMenuItem>
                        )}
                        {canBan &&
                          (p.banned ? (
                            <DropdownMenuItem onClick={() => run(unban, p.username, "Unbanned")}>
                              <ShieldX /> Unban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem destructive onClick={() => run(ban, p.username, "Banned")}>
                              <Ban /> Ban
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to whitelist</DialogTitle>
          </DialogHeader>
          <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Minecraft username" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddToWhitelist} disabled={!addName.trim() || whitelistAdd.isPending}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

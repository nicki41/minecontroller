import { useState } from "react";
import { Ban, LogOut, ShieldCheck, ShieldOff, ListPlus, ListX, ShieldX, Trash2 } from "lucide-react";
import type { PlayerBanDto, PlayerDto } from "@minecraftpanel/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmActionDialog } from "../ConfirmActionDialog";
import type { PlayerActionHandlers } from "../playerActions";
import { usePlayerBans, usePlayerIpHistory, usePlayerNameHistory } from "@/lib/playerDetails";
import { formatDateTime, formatJoinDate } from "@/lib/playerFormat";

const DURATION_PRESETS = [
  { label: "10 minutes", minutes: 10 },
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 360 },
  { label: "1 day", minutes: 1440 },
  { label: "3 days", minutes: 4320 },
  { label: "7 days", minutes: 10080 },
  { label: "30 days", minutes: 43200 },
];

interface PlayerModerationTabProps {
  player: PlayerDto;
  serverId: string;
  actions: PlayerActionHandlers;
  initialCompose: boolean;
  onSendMessage: (username: string, message: string) => Promise<void> | void;
  sending: boolean;
}

export function PlayerModerationTab({ player: p, serverId, actions, initialCompose, onSendMessage, sending }: PlayerModerationTabProps) {
  const [showCompose, setShowCompose] = useState(initialCompose);
  const [messageText, setMessageText] = useState("");
  const { data: bansData, isLoading: bansLoading } = usePlayerBans(serverId, p.username);
  const { data: nameHistoryData } = usePlayerNameHistory(serverId, p.username);
  const { data: ipHistoryData } = usePlayerIpHistory(serverId, p.username);

  async function handleSend() {
    if (!messageText.trim()) return;
    await onSendMessage(p.username, messageText.trim());
    setMessageText("");
    setShowCompose(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-sm font-medium">Quick actions</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {actions.canKick && (
            <ConfirmActionDialog
              trigger={
                <Button variant="outline" size="sm" disabled={!p.online} className="w-full">
                  <LogOut className="h-3.5 w-3.5" /> Kick
                </Button>
              }
              title={`Kick ${p.username}?`}
              description="They'll be disconnected immediately and can rejoin right away."
              confirmLabel="Kick"
              showReason
              onConfirm={(reason) => actions.onKick(p.username, reason)}
            />
          )}
          {actions.canBan &&
            (p.banned ? (
              <ConfirmActionDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <ShieldX className="h-3.5 w-3.5" /> Unban
                  </Button>
                }
                title={`Unban ${p.username}?`}
                description="They'll be able to join the server again."
                confirmLabel="Unban"
                onConfirm={() => actions.onUnban(p.username)}
              />
            ) : (
              <ConfirmActionDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <Ban className="h-3.5 w-3.5" /> Ban
                  </Button>
                }
                title={`Ban ${p.username}?`}
                description="They'll be disconnected and unable to rejoin until unbanned."
                confirmLabel="Ban"
                destructive
                showReason
                onConfirm={(reason) => actions.onBan(p.username, reason)}
              />
            ))}
          {actions.canBan && !p.banned && <TempBanDialog player={p} actions={actions} />}
          {actions.canBan && <IpBanDialog player={p} actions={actions} />}
          {actions.canWhitelist &&
            (p.whitelisted ? (
              <ConfirmActionDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <ListX className="h-3.5 w-3.5" /> Remove WL
                  </Button>
                }
                title={`Remove ${p.username} from the whitelist?`}
                description="They won't be able to join while the server is whitelisted."
                confirmLabel="Remove"
                onConfirm={() => actions.onWhitelistRemove(p.username)}
              />
            ) : (
              <ConfirmActionDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <ListPlus className="h-3.5 w-3.5" /> Whitelist
                  </Button>
                }
                title={`Whitelist ${p.username}?`}
                description="They'll be allowed to join while the server is whitelisted."
                confirmLabel="Whitelist"
                onConfirm={() => actions.onWhitelistAdd(p.username)}
              />
            ))}
          {actions.canOp &&
            (p.op ? (
              <ConfirmActionDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <ShieldOff className="h-3.5 w-3.5" /> Deop
                  </Button>
                }
                title={`Remove operator from ${p.username}?`}
                description="They'll lose access to operator/admin commands."
                confirmLabel="Remove OP"
                onConfirm={() => actions.onDeop(p.username)}
              />
            ) : (
              <ConfirmActionDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <ShieldCheck className="h-3.5 w-3.5" /> Make OP
                  </Button>
                }
                title={`Make ${p.username} an operator?`}
                description="They'll gain access to operator/admin commands."
                confirmLabel="Make OP"
                onConfirm={() => actions.onOp(p.username)}
              />
            ))}
          {actions.canMessage && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowCompose((v) => !v)}>
              Message
            </Button>
          )}
          {actions.canWipe && (
            <ConfirmActionDialog
              trigger={
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2 className="h-3.5 w-3.5" /> Wipe
                </Button>
              }
              title={`Permanently wipe ${p.username}'s data?`}
              description="Deletes their stats and playerdata files — kills, deaths, distance, inventory, XP, everything. They'll start completely fresh next time they join. This cannot be undone."
              confirmLabel="Wipe data"
              destructive
              onConfirm={() => actions.onWipe(p.username)}
            />
          )}
        </div>

        {showCompose && (
          <div className="mt-3 flex gap-2">
            <Textarea
              autoFocus
              rows={1}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Message to ${p.username}…`}
              className="min-h-9 flex-1 resize-none py-2"
            />
            <Button onClick={() => void handleSend()} disabled={!messageText.trim() || sending}>
              Send
            </Button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Ban history</div>
        {bansLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !bansData?.bans.length ? (
          <div className="text-sm text-muted-foreground">No bans on record.</div>
        ) : (
          <div className="space-y-2">
            {bansData.bans.map((ban) => (
              <BanRow key={ban.id} ban={ban} player={p} actions={actions} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-medium">Name history</div>
          {!nameHistoryData?.history.length ? (
            <div className="text-sm text-muted-foreground">No name changes on record.</div>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {nameHistoryData.history.map((entry, i) => (
                <li key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
                  <span className="font-medium">{entry.username}</span>
                  <span className="text-xs text-muted-foreground">{formatJoinDate(entry.changedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">IP history</div>
          {!ipHistoryData?.history.length ? (
            <div className="text-sm text-muted-foreground">No IPs on record.</div>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {ipHistoryData.history.map((entry, i) => (
                <li key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
                  <span className="font-mono">{entry.ip}</span>
                  <span className="text-xs text-muted-foreground">{formatJoinDate(entry.seenAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function BanRow({ ban, player: p, actions }: { ban: PlayerBanDto; player: PlayerDto; actions: PlayerActionHandlers }) {
  const isActive = !ban.revokedAt;
  const isExpired = ban.expiresAt && new Date(ban.expiresAt) <= new Date();

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{ban.type === "IP" ? "IP ban" : "Name ban"}</Badge>
        <span className="font-mono text-xs">{ban.target}</span>
        {isActive && !isExpired && (
          <Badge variant="outline" className="border-transparent bg-status-error/15 text-status-error">
            Active
          </Badge>
        )}
        {ban.revokedAt && <Badge variant="secondary">Removed</Badge>}
        {ban.expiresAt && <span className="text-xs text-muted-foreground">until {formatDateTime(ban.expiresAt)}</span>}
        {isActive && (
          <ConfirmActionDialog
            trigger={
              <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs">
                Remove
              </Button>
            }
            title="Remove this ban?"
            description="They'll be able to join again immediately."
            confirmLabel="Remove ban"
            onConfirm={() => (ban.type === "IP" ? actions.onIpUnban(p.username, ban.target) : actions.onUnban(p.username))}
          />
        )}
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">
        {ban.reason ? `"${ban.reason}"` : "No reason given"} — by {ban.createdByUsername ?? "unknown"} on {formatDateTime(ban.createdAt)}
      </div>
    </div>
  );
}

function TempBanDialog({ player: p, actions }: { player: PlayerDto; actions: PlayerActionHandlers }) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(String(DURATION_PRESETS[2]!.minutes));
  const [reason, setReason] = useState("");

  function handleConfirm() {
    const duration = Number(minutes);
    if (!duration || duration < 1) return;
    actions.onTempBan(p.username, duration, reason.trim() || undefined);
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          Tempban
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporarily ban {p.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Select value={minutes} onValueChange={setMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_PRESETS.map((preset) => (
                  <SelectItem key={preset.minutes} value={String(preset.minutes)}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="resize-none text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Tempban
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IpBanDialog({ player: p, actions }: { player: PlayerDto; actions: PlayerActionHandlers }) {
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState(p.lastIp ?? "");
  const [reason, setReason] = useState("");

  function handleConfirm() {
    if (!ip.trim()) return;
    actions.onIpBan(p.username, ip.trim(), reason.trim() || undefined);
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setIp(p.lastIp ?? "");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          IP ban
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban an IP address</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">IP address</Label>
            <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="203.0.113.11" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="resize-none text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!ip.trim()} onClick={handleConfirm}>
            Ban IP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

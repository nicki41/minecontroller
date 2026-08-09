import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import type { PlayerDto } from "@minecraftpanel/shared";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SkinViewer3D } from "./SkinViewer3D";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import type { PlayerActionHandlers } from "./playerActions";
import { formatJoinDate, formatLastSeen, formatPlaytime } from "@/lib/playerFormat";

interface PlayerDetailModalProps {
  player: PlayerDto | null;
  actions: PlayerActionHandlers;
  initialCompose: boolean;
  onClose: () => void;
  onSendMessage: (username: string, message: string) => Promise<void> | void;
  sending: boolean;
}

function useCopy() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copy = async (field: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1200);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };
  return { copiedField, copy };
}

export function PlayerDetailModal({ player: p, actions, initialCompose, onClose, onSendMessage, sending }: PlayerDetailModalProps) {
  const { copiedField, copy } = useCopy();
  const [showIp, setShowIp] = useState(false);
  const [showCompose, setShowCompose] = useState(initialCompose);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    setShowIp(false);
    setShowCompose(initialCompose);
    setMessageText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.username, initialCompose]);

  if (!p) return null;

  const statusText = p.banned ? "Banned" : p.online ? "Online" : "Offline";
  const statusTextColor = p.banned ? "text-status-error" : p.online ? "text-status-online" : "text-status-offline";
  const statusDotColor = p.banned ? "bg-status-error" : p.online ? "bg-status-online" : "bg-status-offline";
  const statusBg = p.banned ? "bg-status-error/15" : p.online ? "bg-status-online/15" : "bg-status-offline/15";

  async function handleSend() {
    if (!messageText.trim() || !p) return;
    await onSendMessage(p.username, messageText.trim());
    setMessageText("");
    setShowCompose(false);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-w-3xl grid-cols-1 gap-0 overflow-hidden p-0 sm:grid-cols-[260px_1fr]">
        <div className="flex flex-col items-center justify-center gap-3 bg-muted/30 p-6">
          {p.uuid ? (
            <>
              <SkinViewer3D uuid={p.uuid} width={200} height={220} />
              <div className="text-center text-[11px] text-muted-foreground">Drag to rotate · auto-spins</div>
            </>
          ) : (
            <div className="flex h-[220px] w-[200px] items-center justify-center rounded-lg bg-muted/40 text-xs text-muted-foreground">
              No UUID on record
            </div>
          )}
        </div>

        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-4">
            <div className="text-xl font-bold">{p.username}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-mono text-xs text-muted-foreground">{p.uuid ?? "Unknown UUID"}</span>
              {p.uuid && (
                <button onClick={() => copy("uuid", p.uuid!)} className="text-muted-foreground hover:text-foreground" title="Copy UUID">
                  {copiedField === "uuid" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-1.5">
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

          <div className="mb-5 grid grid-cols-2 gap-2.5">
            <Stat label="Last seen" value={formatLastSeen(p)} />
            <Stat label="Playtime" value={formatPlaytime(p.playtimeSeconds)} />
            <Stat label="First seen" value={formatJoinDate(p.firstSeenAt)} />
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">IP address</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="font-mono text-sm font-medium">{!p.lastIp ? "Unknown" : showIp ? p.lastIp : "•••.•••.•••.•••"}</span>
                {p.lastIp && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-5 gap-2">
            {actions.canKick && (
              <ConfirmActionDialog
                trigger={
                  <Button variant="outline" size="sm" disabled={!p.online}>
                    Kick
                  </Button>
                }
                title={`Kick ${p.username}?`}
                description="They'll be disconnected immediately and can rejoin right away."
                confirmLabel="Kick"
                onConfirm={() => actions.onKick(p.username)}
              />
            )}
            {actions.canBan &&
              (p.banned ? (
                <ConfirmActionDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      Unban
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
                    <Button variant="outline" size="sm">
                      Ban
                    </Button>
                  }
                  title={`Ban ${p.username}?`}
                  description="They'll be disconnected and unable to rejoin until unbanned."
                  confirmLabel="Ban"
                  destructive
                  onConfirm={() => actions.onBan(p.username)}
                />
              ))}
            {actions.canWhitelist &&
              (p.whitelisted ? (
                <ConfirmActionDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      Remove WL
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
                    <Button variant="outline" size="sm">
                      Whitelist
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
                    <Button variant="outline" size="sm">
                      Deop
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
                    <Button variant="outline" size="sm">
                      OP
                    </Button>
                  }
                  title={`Make ${p.username} an operator?`}
                  description="They'll gain access to operator/admin commands."
                  confirmLabel="Make OP"
                  onConfirm={() => actions.onOp(p.username)}
                />
              ))}
            {actions.canMessage && (
              <Button variant="outline" size="sm" onClick={() => setShowCompose((v) => !v)}>
                Message
              </Button>
            )}
          </div>

          {showCompose && (
            <div className="flex gap-2">
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
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

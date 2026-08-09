import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { PlayerDto } from "@minecraftpanel/shared";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkinViewer3D } from "./SkinViewer3D";
import { useCopyField } from "./useCopyField";
import type { PlayerActionHandlers } from "./playerActions";
import { PlayerGeneralTab } from "./tabs/PlayerGeneralTab";
import { PlayerActivityTab } from "./tabs/PlayerActivityTab";
import { PlayerModerationTab } from "./tabs/PlayerModerationTab";
import { PlayerStatsTab } from "./tabs/PlayerStatsTab";

interface PlayerDetailModalProps {
  player: PlayerDto | null;
  serverId: string;
  actions: PlayerActionHandlers;
  initialCompose: boolean;
  onClose: () => void;
  onSendMessage: (username: string, message: string) => Promise<void> | void;
  sending: boolean;
}

export function PlayerDetailModal({ player: p, serverId, actions, initialCompose, onClose, onSendMessage, sending }: PlayerDetailModalProps) {
  const { copiedField, copy } = useCopyField();
  const [tab, setTab] = useState(initialCompose ? "moderation" : "general");

  useEffect(() => {
    setTab(initialCompose ? "moderation" : "general");
  }, [p?.username, initialCompose]);

  if (!p) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-w-4xl grid-cols-1 gap-0 overflow-hidden p-0 sm:grid-cols-[260px_1fr]">
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
          <div className="mb-4 flex items-center gap-1.5">
            <div className="text-xl font-bold">{p.username}</div>
            <button onClick={() => copy("username", p.username)} className="text-muted-foreground hover:text-foreground" title="Copy username">
              {copiedField === "username" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="moderation">Moderation</TabsTrigger>
              <TabsTrigger value="stats">Ingame Statistic</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <PlayerGeneralTab player={p} serverId={serverId} actions={actions} />
            </TabsContent>
            <TabsContent value="activity">
              <PlayerActivityTab player={p} serverId={serverId} />
            </TabsContent>
            <TabsContent value="moderation">
              <PlayerModerationTab
                player={p}
                serverId={serverId}
                actions={actions}
                initialCompose={initialCompose}
                onSendMessage={onSendMessage}
                sending={sending}
              />
            </TabsContent>
            <TabsContent value="stats">
              <PlayerStatsTab player={p} serverId={serverId} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

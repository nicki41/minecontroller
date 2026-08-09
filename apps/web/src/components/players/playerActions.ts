/** Shared action-handler contract passed down from ServerPlayersPage into PlayerCard and PlayerDetailModal, so permission/access gating and toast/error handling live in exactly one place. */
export interface PlayerActionHandlers {
  canKick: boolean;
  canBan: boolean;
  canWhitelist: boolean;
  canOp: boolean;
  canMessage: boolean;
  onKick: (username: string) => void;
  onBan: (username: string) => void;
  onUnban: (username: string) => void;
  onWhitelistAdd: (username: string) => void;
  onWhitelistRemove: (username: string) => void;
  onOp: (username: string) => void;
  onDeop: (username: string) => void;
  onOpenDetail: (username: string) => void;
  onOpenMessage: (username: string) => void;
}

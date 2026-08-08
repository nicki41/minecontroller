import { createContext, useContext } from "react";
import { useServerLiveSocket, type ServerLiveState } from "@/lib/useServerLiveSocket";

const ServerLiveContext = createContext<ServerLiveState | null>(null);

export function ServerLiveProvider({ serverId, children }: { serverId: string; children: React.ReactNode }) {
  const live = useServerLiveSocket(serverId);
  return <ServerLiveContext.Provider value={live}>{children}</ServerLiveContext.Provider>;
}

export function useServerLive(): ServerLiveState {
  const ctx = useContext(ServerLiveContext);
  if (!ctx) throw new Error("useServerLive must be used within ServerLiveProvider");
  return ctx;
}

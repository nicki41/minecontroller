import type { MinecraftServerManager } from "../minecraft/MinecraftServerManager.js";
import { ServerLiveSession } from "./ServerLiveSession.js";

export class LiveSessionRegistry {
  private sessions = new Map<string, ServerLiveSession>();

  constructor(private readonly manager: MinecraftServerManager) {}

  getOrCreate(serverId: string): ServerLiveSession {
    let session = this.sessions.get(serverId);
    if (!session) {
      session = new ServerLiveSession(serverId, this.manager, () => {
        if (this.sessions.get(serverId) === session) this.sessions.delete(serverId);
      });
      this.sessions.set(serverId, session);
    }
    return session;
  }

  disposeAll(): void {
    for (const session of this.sessions.values()) session.dispose();
    this.sessions.clear();
  }
}

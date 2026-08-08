import type { ServerSoftware } from "@minecraftpanel/shared";

export interface ProviderVersion {
  id: string;
  stable: boolean;
}

export interface VersionEntry {
  stable: boolean;
  /** Extra env vars (beyond TYPE/VERSION, which the runtime sets generically) the itzg image needs for this exact version. */
  env: Record<string, string>;
}

export type VersionMap = Map<string, VersionEntry>;

/**
 * One implementation per server software family. Responsible only for
 * knowing which Minecraft versions that software supports and which extra
 * itzg/docker-minecraft-server env vars pin the exact build/loader for a
 * chosen version — NOT for talking to Docker at all (that's
 * DockerMinecraftRuntime, shared by every provider).
 */
export interface MinecraftServerProvider {
  readonly software: ServerSoftware;
  listVersions(): Promise<ProviderVersion[]>;
  /** Throws BadRequestError if mcVersion isn't one this provider currently supports. */
  resolveEnv(mcVersion: string): Promise<Record<string, string>>;
}

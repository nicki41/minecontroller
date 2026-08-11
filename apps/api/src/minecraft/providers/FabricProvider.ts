import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { BadRequestError } from "../../lib/errors.js";
import type { InstallPlan, MinecraftServerProvider, ProviderVersion, VersionMap } from "./types.js";

const GAME_VERSIONS_URL = "https://meta.fabricmc.net/v2/versions/game";
const ONE_HOUR_MS = 60 * 60 * 1000;

type FabricGameVersion = { version: string; stable: boolean };

export class FabricProvider implements MinecraftServerProvider {
  readonly software = "FABRIC" as const;

  constructor(private readonly userAgent: string) {}

  private readonly cache = createTtlCache<VersionMap>(ONE_HOUR_MS, async () => {
    const versions = await httpFetchJson<FabricGameVersion[]>(GAME_VERSIONS_URL, this.userAgent);
    const map: VersionMap = new Map();
    for (const v of versions) {
      map.set(v.version, { stable: v.stable, env: {} });
    }
    return map;
  });

  async listVersions(): Promise<ProviderVersion[]> {
    const map = await this.cache();
    return [...map.entries()].map(([id, v]) => ({ id, stable: v.stable }));
  }

  async resolveEnv(mcVersion: string): Promise<Record<string, string>> {
    const map = await this.cache();
    const entry = map.get(mcVersion);
    if (!entry) throw new BadRequestError(`Unknown Fabric-supported Minecraft version: ${mcVersion}`);
    // FABRIC_LOADER_VERSION / FABRIC_LAUNCHER_VERSION intentionally left
    // unset — the runtime image installs the latest loader for VERSION.
    return { TYPE: "FABRIC", ...entry.env };
  }

  // TODO(milestone-4): real installer-jar plan (loader/installer version
  // resolution + ephemeral installer-container invocation). Until then,
  // panel-managed Fabric servers aren't creatable — legacy (itzg) ones are
  // unaffected, since they never call this method.
  async resolveInstallPlan(): Promise<InstallPlan> {
    throw new BadRequestError("Fabric servers aren't supported by the new install pipeline yet.");
  }
}

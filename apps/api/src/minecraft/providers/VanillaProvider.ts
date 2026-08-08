import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { BadRequestError } from "../../lib/errors.js";
import type { MinecraftServerProvider, ProviderVersion, VersionMap } from "./types.js";

const MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const ONE_HOUR_MS = 60 * 60 * 1000;

interface VersionManifest {
  versions: { id: string; type: string }[];
}

export class VanillaProvider implements MinecraftServerProvider {
  readonly software = "VANILLA" as const;

  constructor(private readonly userAgent: string) {}

  private readonly cache = createTtlCache<VersionMap>(ONE_HOUR_MS, async () => {
    const manifest = await httpFetchJson<VersionManifest>(MANIFEST_URL, this.userAgent);
    const map: VersionMap = new Map();
    for (const v of manifest.versions) {
      map.set(v.id, { stable: v.type === "release", env: {} });
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
    if (!entry) throw new BadRequestError(`Unknown Vanilla version: ${mcVersion}`);
    return { TYPE: "VANILLA", ...entry.env };
  }
}

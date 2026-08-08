import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { BadRequestError } from "../../lib/errors.js";
import type { MinecraftServerProvider, ProviderVersion, VersionMap } from "./types.js";

const PROMOTIONS_URL = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
const ONE_HOUR_MS = 60 * 60 * 1000;

interface ForgePromotions {
  promos: Record<string, string>; // "<mcVersion>-recommended" | "<mcVersion>-latest" -> forge build
}

export class ForgeProvider implements MinecraftServerProvider {
  readonly software = "FORGE" as const;

  constructor(private readonly userAgent: string) {}

  private readonly cache = createTtlCache<VersionMap>(ONE_HOUR_MS, async () => {
    const data = await httpFetchJson<ForgePromotions>(PROMOTIONS_URL, this.userAgent);
    const map: VersionMap = new Map();

    for (const [key, build] of Object.entries(data.promos)) {
      const match = /^(.+)-(recommended|latest)$/.exec(key);
      if (!match) continue;
      const [, mcVersion, kind] = match;
      if (!mcVersion) continue;

      // Explicit FORGE_VERSION (mcVersion-forgeBuild) rather than leaving it
      // unset for the image to auto-resolve: Forge (and NeoForge — see
      // NeoForgeProvider) auto-resolution has had real-world bug reports
      // picking the wrong build, and we already have the exact answer here.
      const existing = map.get(mcVersion);
      if (kind === "recommended" || !existing) {
        map.set(mcVersion, { stable: true, env: { FORGE_VERSION: `${mcVersion}-${build}` } });
      }
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
    if (!entry) throw new BadRequestError(`Unknown Forge-supported Minecraft version: ${mcVersion}`);
    return { TYPE: "FORGE", ...entry.env };
  }
}

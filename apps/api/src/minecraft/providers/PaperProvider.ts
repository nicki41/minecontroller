import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { BadRequestError } from "../../lib/errors.js";
import type { MinecraftServerProvider, ProviderVersion, VersionMap } from "./types.js";

// PaperMC retired the old api.papermc.io/v2 API (stopped receiving builds
// end of 2025) in favor of the "Fill" v3 API.
const PROJECT_URL = "https://fill.papermc.io/v3/projects/paper";
const ONE_HOUR_MS = 60 * 60 * 1000;

interface PaperProjectResponse {
  versions: Record<string, string[]>;
}

export class PaperProvider implements MinecraftServerProvider {
  readonly software = "PAPER" as const;

  constructor(private readonly userAgent: string) {}

  private readonly cache = createTtlCache<VersionMap>(ONE_HOUR_MS, async () => {
    const data = await httpFetchJson<PaperProjectResponse>(PROJECT_URL, this.userAgent);
    const map: VersionMap = new Map();
    for (const ids of Object.values(data.versions)) {
      for (const id of ids) {
        // Release-candidate/pre-release builds contain a "-" (e.g. "1.21.11-rc3").
        map.set(id, { stable: !id.includes("-"), env: {} });
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
    if (!entry) throw new BadRequestError(`Unknown Paper version: ${mcVersion}`);
    // PAPER_BUILD intentionally left unset — the runtime image resolves the
    // latest build for the given VERSION on its own.
    return { TYPE: "PAPER", ...entry.env };
  }
}

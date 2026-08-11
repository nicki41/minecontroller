import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { BadRequestError } from "../../lib/errors.js";
import { resolveJavaMajor } from "../runtime/runtimeImages.js";
import type { InstallPlan, MinecraftServerProvider, ProviderVersion, VersionMap } from "./types.js";

// PaperMC retired the old api.papermc.io/v2 API (stopped receiving builds
// end of 2025) in favor of the "Fill" v3 API.
const PROJECT_URL = "https://fill.papermc.io/v3/projects/paper";
const ONE_HOUR_MS = 60 * 60 * 1000;

interface PaperProjectResponse {
  versions: Record<string, string[]>;
}

interface PaperBuild {
  id: number;
  channel: string;
  downloads: Record<string, { name: string; checksums: { sha256: string }; url: string }>;
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

  async resolveInstallPlan(mcVersion: string): Promise<InstallPlan> {
    const map = await this.cache();
    if (!map.has(mcVersion)) throw new BadRequestError(`Unknown Paper version: ${mcVersion}`);

    const builds = await httpFetchJson<PaperBuild[]>(`${PROJECT_URL}/versions/${encodeURIComponent(mcVersion)}/builds`, this.userAgent);
    const stable = builds.filter((b) => b.channel === "STABLE");
    // Fall back to the newest build overall if this version has no stable
    // build yet, rather than refusing to install it at all.
    const pool = stable.length ? stable : builds;
    if (!pool.length) throw new BadRequestError(`No Paper builds available for ${mcVersion}.`);
    const best = pool.reduce((a, b) => (b.id > a.id ? b : a));
    const download = best.downloads["server:default"];
    if (!download) throw new BadRequestError(`Paper build ${best.id} has no server download.`);

    // Paper's build API doesn't report a Java requirement — Paper runs on
    // top of the underlying Vanilla mcVersion, whose requirement applies
    // equally here (see runtimeImages.resolveJavaMajor).
    const javaMajor = await resolveJavaMajor(mcVersion, this.userAgent);

    return {
      kind: "direct-download",
      url: download.url,
      filename: download.name,
      sha256: download.checksums.sha256,
      javaMajor,
      loaderVersion: String(best.id),
    };
  }
}

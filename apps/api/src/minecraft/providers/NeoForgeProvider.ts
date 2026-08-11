import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { BadRequestError } from "../../lib/errors.js";
import type { InstallPlan, MinecraftServerProvider, ProviderVersion, VersionMap } from "./types.js";

const VERSIONS_URL = "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge";
const ONE_HOUR_MS = 60 * 60 * 1000;

interface NeoForgeVersionsResponse {
  versions: string[];
}

/**
 * NeoForge versions ("21.1.45", "26.1.0.0-alpha.1+snapshot-1", ...) are NOT
 * Minecraft versions. Their "<major>.<minor>" prefix maps to Minecraft
 * "1.<major>.<minor>" — except when <minor> is 0, where Minecraft drops the
 * trailing ".0" (NeoForge "21.0.x" is Minecraft "1.21", not "1.21.0").
 */
export function neoForgeVersionToMcVersion(neoForgeVersion: string): string | null {
  const match = /^(\d+)\.(\d+)\./.exec(neoForgeVersion);
  if (!match) return null;
  const [, major, minor] = match as unknown as [string, string, string];
  return minor === "0" ? `1.${major}` : `1.${major}.${minor}`;
}

interface ParsedNeoForgeVersion {
  /** Numeric segments after the major.minor Minecraft-mapped prefix, used to rank builds within one Minecraft version. */
  patchParts: number[];
  isPrerelease: boolean;
}

function parseNeoForgeVersion(version: string): ParsedNeoForgeVersion {
  const core = (version.split(/[-+]/)[0] ?? version).split(".").map((p) => Number.parseInt(p, 10));
  return { patchParts: core.slice(2), isPrerelease: version.includes("-") || version.includes("+") };
}

function comparePatch(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** True if `candidate` should replace `current` as the representative build for a Minecraft version: prefer stable, then highest patch. */
export function isBetterNeoForgeBuild(
  candidate: ParsedNeoForgeVersion,
  current: ParsedNeoForgeVersion | undefined,
): boolean {
  if (!current) return true;
  if (candidate.isPrerelease !== current.isPrerelease) return !candidate.isPrerelease;
  return comparePatch(candidate.patchParts, current.patchParts) > 0;
}

export class NeoForgeProvider implements MinecraftServerProvider {
  readonly software = "NEOFORGE" as const;

  constructor(private readonly userAgent: string) {}

  private readonly cache = createTtlCache<VersionMap>(ONE_HOUR_MS, async () => {
    const data = await httpFetchJson<NeoForgeVersionsResponse>(VERSIONS_URL, this.userAgent);
    const map: VersionMap = new Map();
    const parsedByMcVersion = new Map<string, ParsedNeoForgeVersion>();

    for (const neoForgeVersion of data.versions) {
      const mcVersion = neoForgeVersionToMcVersion(neoForgeVersion);
      if (!mcVersion) continue;

      const parsed = parseNeoForgeVersion(neoForgeVersion);
      if (isBetterNeoForgeBuild(parsed, parsedByMcVersion.get(mcVersion))) {
        parsedByMcVersion.set(mcVersion, parsed);
        map.set(mcVersion, { stable: !parsed.isPrerelease, env: { NEOFORGE_VERSION: neoForgeVersion } });
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
    if (!entry) throw new BadRequestError(`Unknown NeoForge-supported Minecraft version: ${mcVersion}`);
    return { TYPE: "NEOFORGE", ...entry.env };
  }

  // TODO(milestone-5): real installer-jar plan, same shape as ForgeProvider.
  // Until then, panel-managed NeoForge servers aren't creatable — legacy
  // (itzg) ones are unaffected.
  async resolveInstallPlan(): Promise<InstallPlan> {
    throw new BadRequestError("NeoForge servers aren't supported by the new install pipeline yet.");
  }
}

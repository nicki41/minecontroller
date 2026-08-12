import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { BadRequestError } from "../../lib/errors.js";
import { resolveJavaMajor } from "../runtime/runtimeImages.js";
import type { InstallPlan, MinecraftServerProvider, ProviderVersion, VersionMap } from "./types.js";

const META_BASE = "https://meta.fabricmc.net/v2";
const GAME_VERSIONS_URL = `${META_BASE}/versions/game`;
const ONE_HOUR_MS = 60 * 60 * 1000;

type FabricGameVersion = { version: string; stable: boolean };
type FabricLoaderVersion = { loader: { version: string; stable: boolean } };
type FabricInstallerVersion = { version: string; stable: boolean };

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

  async resolveInstallPlan(mcVersion: string): Promise<InstallPlan> {
    const map = await this.cache();
    if (!map.has(mcVersion)) {
      throw new BadRequestError(`Unknown Fabric-supported Minecraft version: ${mcVersion}`);
    }

    const [loaderVersions, installerVersions] = await Promise.all([
      httpFetchJson<FabricLoaderVersion[]>(`${META_BASE}/versions/loader/${mcVersion}`, this.userAgent),
      httpFetchJson<FabricInstallerVersion[]>(`${META_BASE}/versions/installer`, this.userAgent),
    ]);

    const loader = loaderVersions.find((v) => v.loader.stable) ?? loaderVersions[0];
    if (!loader) throw new BadRequestError(`No Fabric loader available for Minecraft version: ${mcVersion}`);

    const installer = installerVersions.find((v) => v.stable) ?? installerVersions[0];
    if (!installer) throw new BadRequestError("No Fabric installer version available.");

    const javaMajor = await resolveJavaMajor(mcVersion, this.userAgent);

    // Fabric's server/jar endpoint is a direct, self-contained launcher jar
    // (verified live: application/java-archive, served from meta.fabricmc.net
    // itself) — no installer *program* to run, unlike Forge/NeoForge. It
    // publishes no upstream hash, so sha1/sha256 are left unset; downloadAndVerify
    // skips verification when neither is provided.
    const url = `${META_BASE}/versions/loader/${mcVersion}/${loader.loader.version}/${installer.version}/server/jar`;

    return {
      kind: "direct-download",
      url,
      filename: "server.jar",
      javaMajor,
      loaderVersion: loader.loader.version,
    };
  }
}

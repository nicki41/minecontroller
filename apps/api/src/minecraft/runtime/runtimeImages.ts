import { httpFetchJson } from "../../lib/httpFetch.js";
import { createTtlCache } from "../../lib/ttlCache.js";

const MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const ONE_HOUR_MS = 60 * 60 * 1000;

/** Versions old enough to predate Mojang's javaVersion field in the per-version manifest (~pre-1.17). Most run fine on Java 8. */
export const LEGACY_JAVA_MAJOR = 8;

interface MojangVersionManifest {
  versions: { id: string; url: string }[];
}

export interface MojangVersionDetail {
  downloads: { server?: { url: string; sha1: string; size: number } };
  javaVersion?: { majorVersion: number };
}

const manifestUrls = createTtlCache<Map<string, string>>(ONE_HOUR_MS, async () => {
  const manifest = await httpFetchJson<MojangVersionManifest>(MANIFEST_URL, "minecraftpanel-runtime-images");
  return new Map(manifest.versions.map((v) => [v.id, v.url]));
});

// Per-version detail JSON is immutable once Mojang publishes a version — no
// TTL needed, just memoize each version's fetch once (shared across every
// provider so Vanilla's own jar-download lookup and Paper/Fabric/Forge/
// NeoForge's Java-major lookup for the same mcVersion don't double-fetch).
const detailCache = new Map<string, Promise<MojangVersionDetail | null>>();

/**
 * Every server software runs on top of one specific Minecraft version, and
 * Java-version compatibility is a property of THAT version, not whatever's
 * layered on it — so this is shared across all five providers rather than
 * duplicated per-provider.
 */
export async function getMojangVersionDetail(mcVersion: string, userAgent: string): Promise<MojangVersionDetail | null> {
  let promise = detailCache.get(mcVersion);
  if (!promise) {
    promise = fetchDetail(mcVersion, userAgent);
    detailCache.set(mcVersion, promise);
  }
  const detail = await promise;
  if (!detail) detailCache.delete(mcVersion); // don't pin a failed/unknown lookup forever
  return detail;
}

async function fetchDetail(mcVersion: string, userAgent: string): Promise<MojangVersionDetail | null> {
  const urls = await manifestUrls();
  const url = urls.get(mcVersion);
  if (!url) return null;
  return httpFetchJson<MojangVersionDetail>(url, userAgent);
}

export async function resolveJavaMajor(mcVersion: string, userAgent: string): Promise<number> {
  const detail = await getMojangVersionDetail(mcVersion, userAgent);
  return detail?.javaVersion?.majorVersion ?? LEGACY_JAVA_MAJOR;
}

// Only java21 is built so far (see runtime-images/java21) — java8/java17
// land once their images exist (Milestone 2's live-Pi checkpoint covers only
// current Vanilla/Paper versions, which genuinely need Java 21). Adding a
// tag here is the only change needed once those images are built.
const AVAILABLE_JAVA_TAGS: { javaMajor: number; image: string }[] = [{ javaMajor: 21, image: "mcpanel-runtime:java21" }];

/** Picks the smallest available runtime image tag whose Java major is >= what the version needs. */
export function resolveRuntimeImageTag(javaMajor: number): string {
  const candidate = [...AVAILABLE_JAVA_TAGS].sort((a, b) => a.javaMajor - b.javaMajor).find((t) => t.javaMajor >= javaMajor);
  if (!candidate) {
    throw new Error(`This Minecraft version needs Java ${javaMajor}, but no runtime image supporting that is available yet.`);
  }
  return candidate.image;
}

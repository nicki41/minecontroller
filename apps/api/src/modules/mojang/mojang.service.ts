import { NotFoundError } from "../../lib/errors.js";

/**
 * SSRF hardening, same convention as Modrinth's ALLOWED_DOWNLOAD_HOSTS
 * (modrinth.service.ts): only Mojang's own profile/texture hosts are ever
 * fetched, and only their bytes are proxied back — the browser never talks
 * to Mojang directly.
 */
const ALLOWED_HOSTS = new Set(["sessionserver.mojang.com", "textures.minecraft.net"]);

const CACHE_TTL_MS = 15 * 60 * 1000;

interface SkinProfile {
  skinUrl: string | null;
  capeUrl: string | null;
  slim: boolean;
}

interface TexturesProperty {
  textures: {
    SKIN?: { url: string; metadata?: { model?: string } };
    CAPE?: { url: string };
  };
}

function assertTrustedUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new NotFoundError("Mojang returned an invalid texture URL.");
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new NotFoundError("Refusing to fetch from an untrusted host.");
  }
  return parsed;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

/**
 * Resolves a Mojang UUID to its current skin/cape texture bytes. Offline-
 * mode/cracked UUIDs (common on self-hosted survival servers) simply won't
 * resolve — every method here returns null/throws NotFoundError on any
 * failure rather than propagating Mojang API errors, so the frontend can
 * fall back to a default Steve/Alex model.
 */
export class MojangService {
  private profileCache = new Map<string, CacheEntry<SkinProfile>>();
  private textureCache = new Map<string, CacheEntry<Buffer>>();

  async getProfile(uuid: string): Promise<SkinProfile> {
    const cached = this.profileCache.get(uuid);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = await this.fetchProfile(uuid);
    this.profileCache.set(uuid, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  private async fetchProfile(uuid: string): Promise<SkinProfile> {
    const empty: SkinProfile = { skinUrl: null, capeUrl: null, slim: false };
    try {
      const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${encodeURIComponent(uuid)}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return empty;
      const body = (await res.json()) as { properties?: { name: string; value: string }[] };
      const texturesProp = body.properties?.find((p) => p.name === "textures");
      if (!texturesProp) return empty;

      const decoded = JSON.parse(Buffer.from(texturesProp.value, "base64").toString("utf8")) as TexturesProperty;
      const skinUrl = decoded.textures.SKIN?.url ?? null;
      const capeUrl = decoded.textures.CAPE?.url ?? null;
      const slim = decoded.textures.SKIN?.metadata?.model === "slim";
      return { skinUrl, capeUrl, slim };
    } catch {
      return empty;
    }
  }

  async getSkinBytes(uuid: string): Promise<Buffer> {
    const profile = await this.getProfile(uuid);
    if (!profile.skinUrl) throw new NotFoundError("No skin available for this player.");
    return this.fetchTexture(profile.skinUrl);
  }

  async getCapeBytes(uuid: string): Promise<Buffer> {
    const profile = await this.getProfile(uuid);
    if (!profile.capeUrl) throw new NotFoundError("This player has no cape.");
    return this.fetchTexture(profile.capeUrl);
  }

  private async fetchTexture(rawUrl: string): Promise<Buffer> {
    const cached = this.textureCache.get(rawUrl);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const url = assertTrustedUrl(rawUrl);
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new NotFoundError("Failed to fetch texture from Mojang.");
    const buffer = Buffer.from(await res.arrayBuffer());
    this.textureCache.set(rawUrl, { value: buffer, expiresAt: Date.now() + CACHE_TTL_MS });
    return buffer;
  }
}

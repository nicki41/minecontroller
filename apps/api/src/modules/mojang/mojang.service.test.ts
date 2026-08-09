import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MojangService } from "./mojang.service.js";

function texturesPayload(skinUrl: string | null, capeUrl: string | null, slim = false) {
  const textures: Record<string, unknown> = {};
  if (skinUrl) textures.SKIN = { url: skinUrl, metadata: slim ? { model: "slim" } : undefined };
  if (capeUrl) textures.CAPE = { url: capeUrl };
  const value = Buffer.from(JSON.stringify({ textures })).toString("base64");
  return { properties: [{ name: "textures", value }] };
}

describe("MojangService", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getProfile", () => {
    it("decodes the base64 textures property into skin/cape URLs and the slim flag", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => texturesPayload("https://textures.minecraft.net/texture/abc", "https://textures.minecraft.net/texture/cape", true),
      });

      const service = new MojangService();
      const profile = await service.getProfile("some-uuid");

      expect(profile).toEqual({ skinUrl: "https://textures.minecraft.net/texture/abc", capeUrl: "https://textures.minecraft.net/texture/cape", slim: true });
    });

    it("returns an empty profile (never throws) when Mojang responds with a non-OK status", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });

      const service = new MojangService();
      const profile = await service.getProfile("unknown-uuid");

      expect(profile).toEqual({ skinUrl: null, capeUrl: null, slim: false });
    });

    it("returns an empty profile when the request itself throws (network error)", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));

      const service = new MojangService();
      const profile = await service.getProfile("some-uuid");

      expect(profile).toEqual({ skinUrl: null, capeUrl: null, slim: false });
    });

    it("caches the profile so a second lookup for the same UUID doesn't refetch", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => texturesPayload("https://textures.minecraft.net/texture/abc", null),
      });

      const service = new MojangService();
      await service.getProfile("some-uuid");
      await service.getProfile("some-uuid");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSkinBytes / getCapeBytes", () => {
    it("fetches and returns the skin texture bytes for a resolvable profile", async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => texturesPayload("https://textures.minecraft.net/texture/abc", null) })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });

      const service = new MojangService();
      const bytes = await service.getSkinBytes("some-uuid");

      expect(Buffer.from(bytes)).toEqual(Buffer.from([1, 2, 3]));
      expect(fetchMock).toHaveBeenNthCalledWith(2, expect.any(URL), expect.anything());
    });

    it("upgrades Mojang's plain http:// texture URL to https:// before fetching (Mojang's own API reports http://)", async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => texturesPayload("http://textures.minecraft.net/texture/abc", null) })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([9]).buffer });

      const service = new MojangService();
      const bytes = await service.getSkinBytes("some-uuid");

      expect(Buffer.from(bytes)).toEqual(Buffer.from([9]));
      const fetchedUrl = fetchMock.mock.calls[1]![0] as URL;
      expect(fetchedUrl.protocol).toBe("https:");
      expect(fetchedUrl.hostname).toBe("textures.minecraft.net");
    });

    it("throws NotFoundError when the player has no skin on record", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => texturesPayload(null, null) });

      const service = new MojangService();
      await expect(service.getSkinBytes("some-uuid")).rejects.toThrow();
    });

    it("throws NotFoundError when the player has no cape on record", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => texturesPayload("https://textures.minecraft.net/texture/abc", null) });

      const service = new MojangService();
      await expect(service.getCapeBytes("some-uuid")).rejects.toThrow();
    });

    it("refuses to fetch a texture URL from an untrusted host (SSRF guard)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => texturesPayload("https://evil.example.com/steal-me.png", null),
      });

      const service = new MojangService();
      await expect(service.getSkinBytes("some-uuid")).rejects.toThrow();
      // Only the profile lookup should have gone out — the untrusted texture URL must never be fetched.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

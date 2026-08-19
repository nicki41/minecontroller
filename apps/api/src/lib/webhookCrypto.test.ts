import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({ env: { SESSION_SECRET: "test-session-secret-not-for-production-use-0000" } }));

const { encryptChannelConfig, decryptChannelConfig } = await import("./webhookCrypto.js");

describe("encryptChannelConfig / decryptChannelConfig", () => {
  it("round-trips a config object exactly", () => {
    const config = { webhookUrl: "https://discord.com/api/webhooks/123/abc" };
    expect(decryptChannelConfig(encryptChannelConfig(config))).toEqual(config);
  });

  it("round-trips a multi-field config object (Telegram-shaped)", () => {
    const config = { botToken: "123456:ABC-DEF", chatId: "-100987654321" };
    expect(decryptChannelConfig(encryptChannelConfig(config))).toEqual(config);
  });

  it("never stores the plaintext secret in the ciphertext output", () => {
    const config = { webhookUrl: "https://discord.com/api/webhooks/123/super-secret-token" };
    expect(encryptChannelConfig(config)).not.toContain("super-secret-token");
  });

  it("produces different ciphertext for the same config each time (random IV)", () => {
    const config = { webhookUrl: "https://discord.com/api/webhooks/123/abc" };
    expect(encryptChannelConfig(config)).not.toBe(encryptChannelConfig(config));
  });

  it("rejects a tampered ciphertext instead of silently returning garbage", () => {
    const encoded = encryptChannelConfig({ webhookUrl: "https://discord.com/api/webhooks/123/abc" });
    const buf = Buffer.from(encoded, "base64");
    const lastIndex = buf.length - 1;
    buf[lastIndex] = (buf[lastIndex] ?? 0) ^ 0xff; // flip a bit in the ciphertext
    expect(() => decryptChannelConfig(buf.toString("base64"))).toThrow();
  });
});

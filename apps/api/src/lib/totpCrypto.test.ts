import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({ env: { SESSION_SECRET: "test-session-secret-not-for-production-use-0000" } }));

const { encryptTotpSecret, decryptTotpSecret } = await import("./totpCrypto.js");

describe("encryptTotpSecret / decryptTotpSecret", () => {
  it("round-trips a base32 secret exactly", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    expect(decryptTotpSecret(encryptTotpSecret(secret))).toBe(secret);
  });

  it("never stores the plaintext secret in the ciphertext output", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    expect(encryptTotpSecret(secret)).not.toContain(secret);
  });

  it("produces different ciphertext for the same secret each time (random IV)", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    expect(encryptTotpSecret(secret)).not.toBe(encryptTotpSecret(secret));
  });

  it("rejects a tampered ciphertext instead of silently returning garbage", () => {
    const encoded = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const buf = Buffer.from(encoded, "base64");
    const lastIndex = buf.length - 1;
    buf[lastIndex] = (buf[lastIndex] ?? 0) ^ 0xff; // flip a bit in the ciphertext
    expect(() => decryptTotpSecret(buf.toString("base64"))).toThrow();
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({ env: { SESSION_SECRET: "test-session-secret-not-for-production-use-0000" } }));

const { generateRecoveryCodes, hashRecoveryCode } = await import("./recoveryCodes.js");

describe("generateRecoveryCodes", () => {
  it("generates 10 codes in XXXXX-XXXXX format", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    for (const code of codes) expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });

  it("never generates duplicate codes within one batch", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("avoids visually ambiguous characters (0/O, 1/I/L)", () => {
    const codes = generateRecoveryCodes();
    for (const code of codes) expect(code).not.toMatch(/[01ILO]/);
  });
});

describe("hashRecoveryCode", () => {
  it("is deterministic for the same code", () => {
    expect(hashRecoveryCode("ABCDE-FGHJK")).toBe(hashRecoveryCode("ABCDE-FGHJK"));
  });

  it("is case-insensitive (so a user retyping in lowercase still works)", () => {
    expect(hashRecoveryCode("abcde-fghjk")).toBe(hashRecoveryCode("ABCDE-FGHJK"));
  });

  it("is insensitive to surrounding whitespace", () => {
    expect(hashRecoveryCode("  ABCDE-FGHJK  ")).toBe(hashRecoveryCode("ABCDE-FGHJK"));
  });

  it("produces different hashes for different codes", () => {
    expect(hashRecoveryCode("ABCDE-FGHJK")).not.toBe(hashRecoveryCode("ABCDE-FGHJM"));
  });
});

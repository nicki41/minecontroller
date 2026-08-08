import { describe, expect, it } from "vitest";
import { isBetterNeoForgeBuild, neoForgeVersionToMcVersion } from "./NeoForgeProvider.js";

describe("neoForgeVersionToMcVersion", () => {
  it("maps a plain X.Y.Z neoforge version to Minecraft 1.X.Y", () => {
    expect(neoForgeVersionToMcVersion("21.1.45")).toBe("1.21.1");
    expect(neoForgeVersionToMcVersion("21.11.45")).toBe("1.21.11");
  });

  it("drops the trailing .0 when the minecraft minor version is 0", () => {
    expect(neoForgeVersionToMcVersion("21.0.12")).toBe("1.21");
  });

  it("handles extra segments and prerelease suffixes after the major.minor prefix", () => {
    expect(neoForgeVersionToMcVersion("26.1.0.0-alpha.1+snapshot-1")).toBe("1.26.1");
  });

  it("returns null for garbage input", () => {
    expect(neoForgeVersionToMcVersion("not-a-version")).toBeNull();
  });
});

describe("isBetterNeoForgeBuild", () => {
  const stable = (...patchParts: number[]) => ({ patchParts, isPrerelease: false });
  const pre = (...patchParts: number[]) => ({ patchParts, isPrerelease: true });

  it("accepts any candidate when there is no current build yet", () => {
    expect(isBetterNeoForgeBuild(stable(1), undefined)).toBe(true);
  });

  it("prefers a stable build over a prerelease, even with a lower patch number", () => {
    expect(isBetterNeoForgeBuild(stable(1), pre(99))).toBe(true);
    expect(isBetterNeoForgeBuild(pre(99), stable(1))).toBe(false);
  });

  it("prefers the higher patch number when stability is equal", () => {
    expect(isBetterNeoForgeBuild(stable(2), stable(1))).toBe(true);
    expect(isBetterNeoForgeBuild(stable(1), stable(2))).toBe(false);
  });

  it("compares multi-segment patch numbers positionally, not lexicographically", () => {
    expect(isBetterNeoForgeBuild(stable(1, 0), stable(0, 9))).toBe(true);
  });
});

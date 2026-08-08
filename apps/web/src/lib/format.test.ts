import { describe, expect, it } from "vitest";
import { formatBytes, formatMb } from "./format.js";

describe("formatBytes", () => {
  it("formats zero and negative values as 0 B", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
  });

  it("formats non-finite input as 0 B", () => {
    expect(formatBytes(NaN)).toBe("0 B");
    expect(formatBytes(Infinity)).toBe("0 B");
  });

  it("keeps small byte counts in B with no decimals", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("switches units at 1024-byte boundaries", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  it("drops the decimal once the value reaches double digits", () => {
    expect(formatBytes(10 * 1024)).toBe("10 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("caps out at TB for absurdly large values instead of throwing", () => {
    expect(formatBytes(1024 ** 5)).toBe("1024 TB");
  });
});

describe("formatMb", () => {
  it("delegates to formatBytes after converting MB to bytes", () => {
    expect(formatMb(1)).toBe("1.0 MB");
    expect(formatMb(2048)).toBe("2.0 GB");
  });
});

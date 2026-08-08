import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatUptime } from "./uptime.js";

const NOW = new Date("2026-08-07T12:00:00.000Z");

describe("formatUptime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an em dash when there is no start time", () => {
    expect(formatUptime(null)).toBe("—");
  });

  it("returns an em dash for a start time in the future (clock skew)", () => {
    expect(formatUptime(new Date(NOW.getTime() + 60_000).toISOString())).toBe("—");
  });

  it("formats minutes-only uptime", () => {
    expect(formatUptime(new Date(NOW.getTime() - 5 * 60_000).toISOString())).toBe("5m");
  });

  it("formats hours and minutes once past an hour", () => {
    expect(formatUptime(new Date(NOW.getTime() - (2 * 60 + 15) * 60_000).toISOString())).toBe("2h 15m");
  });

  it("formats days and hours once past a day, dropping minutes", () => {
    expect(formatUptime(new Date(NOW.getTime() - (26 * 60 + 30) * 60_000).toISOString())).toBe("1d 2h");
  });
});

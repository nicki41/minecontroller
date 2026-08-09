import { describe, expect, it } from "vitest";
import { summarizeSessions } from "./playerSessions.service.js";

const NOW = new Date("2026-08-09T12:00:00Z");

describe("summarizeSessions", () => {
  it("aggregates closed sessions within range: count, average, longest, total", () => {
    const sessions = [
      { startedAt: new Date("2026-08-09T09:00:00Z"), endedAt: new Date("2026-08-09T09:30:00Z"), durationSeconds: 1800 },
      { startedAt: new Date("2026-08-09T10:00:00Z"), endedAt: new Date("2026-08-09T10:10:00Z"), durationSeconds: 600 },
    ];
    const summary = summarizeSessions(sessions, "today", NOW);

    expect(summary.sessionCount).toBe(2);
    expect(summary.totalSeconds).toBe(2400);
    expect(summary.averageSessionSeconds).toBe(1200);
    expect(summary.longestSessionSeconds).toBe(1800);
  });

  it("uses live elapsed time for a still-open session (durationSeconds null)", () => {
    const sessions = [{ startedAt: new Date("2026-08-09T11:00:00Z"), endedAt: null, durationSeconds: null }];
    const summary = summarizeSessions(sessions, "today", NOW);

    expect(summary.totalSeconds).toBe(3600); // 11:00 -> 12:00
    expect(summary.sessionCount).toBe(1);
  });

  it("excludes sessions outside the requested range", () => {
    const sessions = [
      { startedAt: new Date("2026-07-01T00:00:00Z"), endedAt: new Date("2026-07-01T01:00:00Z"), durationSeconds: 3600 }, // way outside 7d
      { startedAt: new Date("2026-08-08T00:00:00Z"), endedAt: new Date("2026-08-08T01:00:00Z"), durationSeconds: 3600 }, // within 7d
    ];
    const summary = summarizeSessions(sessions, "7d", NOW);

    expect(summary.sessionCount).toBe(1);
    expect(summary.totalSeconds).toBe(3600);
  });

  it("includes everything for range 'all', regardless of age", () => {
    const sessions = [{ startedAt: new Date("2020-01-01T00:00:00Z"), endedAt: new Date("2020-01-01T01:00:00Z"), durationSeconds: 3600 }];
    const summary = summarizeSessions(sessions, "all", NOW);
    expect(summary.sessionCount).toBe(1);
  });

  it("buckets by hour for 'today' and by day otherwise", () => {
    const todaySummary = summarizeSessions(
      [{ startedAt: new Date("2026-08-09T09:15:00Z"), endedAt: new Date("2026-08-09T09:45:00Z"), durationSeconds: 1800 }],
      "today",
      NOW,
    );
    expect(todaySummary.buckets).toEqual([{ bucket: "2026-08-09T09:00", seconds: 1800 }]);

    const weekSummary = summarizeSessions(
      [{ startedAt: new Date("2026-08-08T09:15:00Z"), endedAt: new Date("2026-08-08T09:45:00Z"), durationSeconds: 1800 }],
      "7d",
      NOW,
    );
    expect(weekSummary.buckets).toEqual([{ bucket: "2026-08-08", seconds: 1800 }]);
  });

  it("returns zeroed-out summary for no sessions", () => {
    const summary = summarizeSessions([], "30d", NOW);
    expect(summary).toEqual({
      range: "30d",
      buckets: [],
      sessionCount: 0,
      averageSessionSeconds: 0,
      longestSessionSeconds: 0,
      totalSeconds: 0,
    });
  });
});

import type { PrismaClient } from "@prisma/client";
import type { MetricsHistoryStore } from "../../minecraft/MetricsHistoryStore.js";
import type { NotificationDispatcherService } from "./notificationDispatcher.service.js";

const CHECK_MS = 60_000;
const MEMORY_WARN_RATIO = 0.9;
/** Once a server crosses the threshold, don't re-warn again for this long while it stays high — an every-60s poll would otherwise spam a notification per tick. */
const RENOTIFY_COOLDOWN_MS = 30 * 60_000;

/**
 * Polls MetricsHistoryStore (already fed by MetricsHistoryCollector — see
 * plugins/metricsHistory.ts) for high memory usage rather than adding its
 * own collection loop. TPS isn't tracked anywhere in this codebase (no RCON
 * command exposes it), so "performance warning" is memory-usage-based only.
 */
export class PerformanceChecker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly lastWarnedAt = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metricsHistory: MetricsHistoryStore,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.checkAll(), CHECK_MS);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async checkAll(): Promise<void> {
    const servers = await this.prisma.server.findMany({ where: { status: "RUNNING" }, select: { id: true, name: true } });

    for (const server of servers) {
      const samples = this.metricsHistory.getRange(server.id, "5m");
      const latest = samples[samples.length - 1];
      if (!latest || !latest.memoryLimitBytes) continue;

      const ratio = latest.memoryUsageBytes / latest.memoryLimitBytes;
      if (ratio < MEMORY_WARN_RATIO) {
        this.lastWarnedAt.delete(server.id); // re-arm once usage drops back down
        continue;
      }

      const lastWarned = this.lastWarnedAt.get(server.id) ?? 0;
      if (Date.now() - lastWarned < RENOTIFY_COOLDOWN_MS) continue;
      this.lastWarnedAt.set(server.id, Date.now());

      await this.dispatcher.dispatch({
        serverId: server.id,
        category: "performance",
        title: `${server.name}: high memory usage`,
        body: `Using ${Math.round(ratio * 100)}% of its memory limit.`,
      });
    }
  }
}

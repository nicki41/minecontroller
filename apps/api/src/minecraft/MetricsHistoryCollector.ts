import type { PrismaClient } from "@prisma/client";
import type { MetricsSampleDto } from "@minecraftpanel/shared";
import { logger } from "../lib/logger.js";
import type { MinecraftServerManager } from "./MinecraftServerManager.js";
import type { MetricsHistoryStore } from "./MetricsHistoryStore.js";

const POLL_MS = 30_000;
/** Directory-size sampling walks the whole data dir — too expensive to run every 30s per server, so it only happens on every Nth tick. */
const DISK_SAMPLE_EVERY_N_TICKS = 10; // ~5 minutes at POLL_MS=30s

/** "There are 2 of a max of 20 players online: Alice, Bob" — same shape PlayerService.getOnlinePlayerNames() parses. */
function parsePlayerCount(listResponse: string): number | null {
  const match = /there are (\d+) of a max/i.exec(listResponse.trim());
  return match?.[1] ? Number(match[1]) : null;
}

/**
 * Background poller feeding MetricsHistoryStore, independent of whether
 * anyone currently has the server's live WebSocket open — so the Overview
 * page's charts already have real recent history the first time a user
 * opens it, rather than starting empty and only filling in from that point
 * on. Only polls servers Docker reports as RUNNING (a stopped/creating
 * server has no container stats worth recording).
 */
export class MetricsHistoryCollector {
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly manager: MinecraftServerManager,
    private readonly store: MetricsHistoryStore,
  ) {}

  start(intervalMs = POLL_MS): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.pollAll(), intervalMs);
    this.timer.unref?.();
    void this.pollAll();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async pollAll(): Promise<void> {
    const sampleDisk = this.tick % DISK_SAMPLE_EVERY_N_TICKS === 0;
    this.tick++;

    const servers = await this.prisma.server.findMany({ where: { status: "RUNNING" }, select: { id: true } });
    await Promise.all(servers.map((s) => this.pollOne(s.id, sampleDisk)));
  }

  private async pollOne(serverId: string, sampleDisk: boolean): Promise<void> {
    try {
      const stats = await this.manager.getStats(serverId);
      if (!stats) return;

      const [diskUsageBytes, playerCount] = await Promise.all([
        sampleDisk ? this.manager.getDiskUsageBytes(serverId).catch(() => null) : Promise.resolve(null),
        this.manager
          .sendCommand(serverId, "list")
          .then(parsePlayerCount)
          .catch(() => null), // RCON not ready right after start, or server stopped mid-poll — skip player count this sample
      ]);

      const sample: MetricsSampleDto = {
        timestamp: Date.now(),
        cpuPercent: stats.cpuPercent,
        memoryUsageBytes: stats.memoryUsageBytes,
        memoryLimitBytes: stats.memoryLimitBytes,
        diskUsageBytes,
        networkRxBytes: stats.networkRxBytes,
        networkTxBytes: stats.networkTxBytes,
        playerCount,
      };
      this.store.record(serverId, sample);
    } catch (err) {
      logger.debug({ err, serverId }, "Failed to poll metrics history");
    }
  }
}

import type { AccessLevel, ServerSoftware, ServerStatus } from "./enums.js";

export interface ServerDto {
  id: string;
  name: string;
  description: string | null;
  software: ServerSoftware;
  mcVersion: string;
  status: ServerStatus;
  statusDetail: string | null;
  port: number;
  memoryMb: number;
  cpuCores: number;
  diskLimitMb: number | null;
  autoRestartEnabled: boolean;
  restartCron: string | null;
  eulaAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  /** The requesting user's access level on this server. Owner is always reported as FULL, even though they bypass ServerAccess entirely. */
  myAccessLevel: AccessLevel;
}

export interface ServerStatsDto {
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  diskUsageBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  /** ISO timestamp the container last started, or null if it isn't running. */
  startedAt: string | null;
}

export type MetricsRange = "5m" | "15m" | "1h" | "6h" | "24h";

export interface MetricsSampleDto {
  timestamp: number;
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  /** Directory-size sampling is expensive, so this is populated only on a slower cadence than the other fields — null on samples where it wasn't measured. */
  diskUsageBytes: number | null;
  networkRxBytes: number;
  networkTxBytes: number;
  /** Null when the server wasn't RUNNING (no RCON) at sample time. */
  playerCount: number | null;
}

export interface MetricsHistoryDto {
  range: MetricsRange;
  samples: MetricsSampleDto[];
}

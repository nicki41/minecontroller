import type { ServerStatus } from "./enums.js";

export interface ConsoleLineDto {
  id: number;
  timestamp: number;
  text: string;
}

/** CPU/RAM only — polled every few seconds over the socket. Disk usage is a directory walk, refreshed separately (and much less often) over REST. */
export interface LiveStatsDto {
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  startedAt: string | null;
}

/** Messages the server sends over the /ws/servers/:id socket. */
export type ServerWsServerMessage =
  | { type: "status"; status: ServerStatus; statusDetail: string | null }
  | { type: "stats"; stats: LiveStatsDto }
  | { type: "console:backlog"; lines: ConsoleLineDto[] }
  | { type: "console:line"; line: ConsoleLineDto }
  | { type: "info"; message: string }
  | { type: "error"; message: string };

/** Messages the client may send over the /ws/servers/:id socket. */
export type ServerWsClientMessage = { type: "command"; command: string };

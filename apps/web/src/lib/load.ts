/**
 * A single "load" percentage combining CPU and RAM, each normalized against
 * what's actually allocated to this server (cpuCores/memoryLimitBytes) —
 * not raw host-relative usage, which isn't meaningful on its own (200% CPU
 * means very different things for a 1-core vs 4-core server).
 */
export function computeLoadPercent(
  cpuPercent: number,
  memoryUsageBytes: number,
  memoryLimitBytes: number,
  cpuCores: number,
): number {
  const cpuLoad = cpuCores > 0 ? cpuPercent / cpuCores : 0;
  const ramLoad = memoryLimitBytes > 0 ? (memoryUsageBytes / memoryLimitBytes) * 100 : 0;
  return Math.max(0, Math.min(100, (cpuLoad + ramLoad) / 2));
}

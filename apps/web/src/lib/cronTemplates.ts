/** Pure builders for the Scheduler tab's "Simple" cron templates — each always produces a valid 5-field expression cron-parser can evaluate. */

export function buildDailyCron(hour: number, minute: number): string {
  return `${minute} ${hour} * * *`;
}

export function buildEveryNHoursCron(everyNHours: number): string {
  const n = Math.min(23, Math.max(1, Math.round(everyNHours)));
  return `0 */${n} * * *`;
}

/** All at minute :00 — a single cron expression can't cleanly encode a mix of arbitrary HH:MM pairs, so this template trades that off for staying honest about what it produces. */
export function buildTimesPerDayCron(hours: number[]): string {
  const sorted = [...new Set(hours)].sort((a, b) => a - b);
  return `0 ${sorted.length ? sorted.join(",") : "0"} * * *`;
}

/** days: 0 (Sunday) – 6 (Saturday), matching cron's day-of-week field. */
export function buildWeeklyCron(hour: number, minute: number, days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  return `${minute} ${hour} * * ${sorted.length ? sorted.join(",") : "*"}`;
}

export function parseTime(value: string): { hour: number; minute: number } {
  const parts = value.split(":").map(Number);
  const hour = parts[0];
  const minute = parts[1];
  return { hour: Number.isFinite(hour) ? (hour as number) : 0, minute: Number.isFinite(minute) ? (minute as number) : 0 };
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

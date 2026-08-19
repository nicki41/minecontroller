export interface NotificationPayload {
  title: string;
  body: string;
  /** Absolute URL (the frontend origin + the relative path) — external services can't resolve a relative one. */
  url?: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}
export interface SlackConfig {
  webhookUrl: string;
}
export interface TelegramConfig {
  botToken: string;
  chatId: string;
}
export interface WebhookConfig {
  url: string;
}

const TIMEOUT_MS = 10_000;

/** Shared by every channel client below — a third party being slow/down must never block the event that triggered the notification. */
export async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Request to ${new URL(url).host} failed: ${res.status} ${res.statusText}`);
  }
}

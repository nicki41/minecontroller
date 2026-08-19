import { postJson, type SlackConfig, type NotificationPayload } from "./types.js";

/** Slack's incoming-webhook API: a plain JSON POST with a "text" field (or richer "blocks"). */
export async function send(config: SlackConfig, payload: NotificationPayload): Promise<void> {
  const text = `*${payload.title}*\n${payload.body}${payload.url ? `\n${payload.url}` : ""}`;
  await postJson(config.webhookUrl, { text });
}

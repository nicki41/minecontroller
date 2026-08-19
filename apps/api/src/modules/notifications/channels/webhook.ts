import { postJson, type WebhookConfig, type NotificationPayload } from "./types.js";

/** Generic target for anything not explicitly supported — a plain JSON POST of the raw event. */
export async function send(config: WebhookConfig, payload: NotificationPayload): Promise<void> {
  await postJson(config.url, {
    title: payload.title,
    body: payload.body,
    url: payload.url,
  });
}

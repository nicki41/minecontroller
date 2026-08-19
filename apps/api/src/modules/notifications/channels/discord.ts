import { postJson, type DiscordConfig, type NotificationPayload } from "./types.js";

/** Discord's incoming-webhook API: a plain JSON POST, no bot/auth needed. */
export async function send(config: DiscordConfig, payload: NotificationPayload): Promise<void> {
  await postJson(config.webhookUrl, {
    embeds: [
      {
        title: payload.title,
        description: payload.body,
        url: payload.url,
        color: 0xd6598f, // matches the panel's own accent color
      },
    ],
  });
}

import { postJson, type TelegramConfig, type NotificationPayload } from "./types.js";

/** Telegram Bot API's sendMessage — a plain JSON POST to api.telegram.org/bot<token>/sendMessage. */
export async function send(config: TelegramConfig, payload: NotificationPayload): Promise<void> {
  const text = `*${escapeMarkdown(payload.title)}*\n${escapeMarkdown(payload.body)}${payload.url ? `\n${payload.url}` : ""}`;
  await postJson(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    chat_id: config.chatId,
    text,
    parse_mode: "Markdown",
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

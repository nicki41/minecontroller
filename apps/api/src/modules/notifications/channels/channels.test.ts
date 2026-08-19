import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { send as sendDiscord } from "./discord.js";
import { send as sendSlack } from "./slack.js";
import { send as sendTelegram } from "./telegram.js";
import { send as sendWebhook } from "./webhook.js";

const PAYLOAD = { title: "Server offline", body: "Verify Server has stopped.", url: "https://panel.example/servers/abc" };

describe("notification channel clients", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Discord: POSTs an embed to the webhook URL", async () => {
    await sendDiscord({ webhookUrl: "https://discord.com/api/webhooks/1/abc" }, PAYLOAD);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://discord.com/api/webhooks/1/abc");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.embeds[0]).toMatchObject({ title: PAYLOAD.title, description: PAYLOAD.body, url: PAYLOAD.url });
  });

  it("Slack: POSTs a text payload to the webhook URL", async () => {
    await sendSlack({ webhookUrl: "https://hooks.slack.com/services/1/2/abc" }, PAYLOAD);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://hooks.slack.com/services/1/2/abc");
    const body = JSON.parse(init.body);
    expect(body.text).toContain(PAYLOAD.title);
    expect(body.text).toContain(PAYLOAD.body);
    expect(body.text).toContain(PAYLOAD.url);
  });

  it("Telegram: POSTs to the bot API with the chat ID and escaped Markdown", async () => {
    await sendTelegram({ botToken: "123:abc", chatId: "-100987654321" }, { ...PAYLOAD, title: "Alert!" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe("-100987654321");
    expect(body.text).toContain("Alert\\!"); // "!" is a Markdown-reserved char, must be escaped
  });

  it("generic webhook: POSTs the raw payload fields to the given URL", async () => {
    await sendWebhook({ url: "https://example.com/hook" }, PAYLOAD);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.com/hook");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ title: PAYLOAD.title, body: PAYLOAD.body, url: PAYLOAD.url });
  });

  it("throws (rather than swallowing) when the target responds with a non-OK status", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" });
    await expect(sendDiscord({ webhookUrl: "https://discord.com/api/webhooks/1/abc" }, PAYLOAD)).rejects.toThrow();
  });
});

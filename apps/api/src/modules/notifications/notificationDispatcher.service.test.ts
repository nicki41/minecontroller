import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/env.js", () => ({ env: { WEB_ORIGIN: "https://panel.example" } }));

const sendWebPushMock = vi.fn();
vi.mock("./webPushSender.js", () => ({ sendWebPush: (...args: unknown[]) => sendWebPushMock(...args) }));

const sendToChannelMock = vi.fn();
vi.mock("./channels/index.js", () => ({ sendToChannel: (...args: unknown[]) => sendToChannelMock(...args) }));

vi.mock("../../lib/webhookCrypto.js", () => ({
  decryptChannelConfig: (encoded: string) => JSON.parse(encoded),
}));

const { NotificationDispatcherService } = await import("./notificationDispatcher.service.js");

function makeFakePrisma(opts: {
  preferences?: { user: { pushSubscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[] } }[];
  channels?: { id: string; type: string; configEncrypted: string }[];
}) {
  return {
    notificationPreference: {
      findMany: vi.fn(async () => opts.preferences ?? []),
    },
    notificationChannel: {
      findMany: vi.fn(async () => opts.channels ?? []),
    },
    pushSubscription: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };
}

describe("NotificationDispatcherService", () => {
  beforeEach(() => {
    sendWebPushMock.mockReset().mockResolvedValue({ ok: true, expired: false });
    sendToChannelMock.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.clearAllMocks());

  it("sends push to every subscription of every user subscribed to that server+category", async () => {
    const prisma = makeFakePrisma({
      preferences: [
        {
          user: {
            pushSubscriptions: [
              { id: "sub-1", endpoint: "https://push.example/1", p256dh: "a", auth: "b" },
              { id: "sub-2", endpoint: "https://push.example/2", p256dh: "c", auth: "d" },
            ],
          },
        },
      ],
    });
    const dispatcher = new NotificationDispatcherService(prisma as never);

    await dispatcher.dispatch({ serverId: "srv-1", category: "crash", title: "t", body: "b" });

    expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ serverId: "srv-1", crash: true }) }),
    );
    expect(sendWebPushMock).toHaveBeenCalledTimes(2);
  });

  it("prunes push subscriptions the push service reports as expired", async () => {
    const prisma = makeFakePrisma({
      preferences: [{ user: { pushSubscriptions: [{ id: "sub-1", endpoint: "e", p256dh: "a", auth: "b" }] } }],
    });
    sendWebPushMock.mockResolvedValueOnce({ ok: false, expired: true });
    const dispatcher = new NotificationDispatcherService(prisma as never);

    await dispatcher.dispatch({ serverId: "srv-1", category: "backup", title: "t", body: "b" });

    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["sub-1"] } } });
  });

  it("decrypts each matching channel's config and sends with an absolute URL", async () => {
    const prisma = makeFakePrisma({
      channels: [{ id: "ch-1", type: "DISCORD", configEncrypted: JSON.stringify({ webhookUrl: "https://discord.example/hook" }) }],
    });
    const dispatcher = new NotificationDispatcherService(prisma as never);

    await dispatcher.dispatch({ serverId: "srv-1", category: "serverStatus", title: "Offline", body: "It stopped." });

    expect(prisma.notificationChannel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ serverId: "srv-1", serverStatus: true }) }),
    );
    expect(sendToChannelMock).toHaveBeenCalledWith(
      "DISCORD",
      { webhookUrl: "https://discord.example/hook" },
      expect.objectContaining({ title: "Offline", body: "It stopped.", url: "https://panel.example/servers/srv-1" }),
    );
  });

  it("a channel send failure doesn't stop other channels or push from being notified", async () => {
    const prisma = makeFakePrisma({
      preferences: [{ user: { pushSubscriptions: [{ id: "sub-1", endpoint: "e", p256dh: "a", auth: "b" }] } }],
      channels: [{ id: "ch-1", type: "WEBHOOK", configEncrypted: JSON.stringify({ url: "https://example.com/hook" }) }],
    });
    sendToChannelMock.mockRejectedValueOnce(new Error("network error"));
    const dispatcher = new NotificationDispatcherService(prisma as never);

    await expect(dispatcher.dispatch({ serverId: "srv-1", category: "crash", title: "t", body: "b" })).resolves.not.toThrow();
    expect(sendWebPushMock).toHaveBeenCalledTimes(1);
  });
});

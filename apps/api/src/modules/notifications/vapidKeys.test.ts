import { afterEach, describe, expect, it, vi } from "vitest";

const generateVAPIDKeysMock = vi.fn();
vi.mock("web-push", () => ({ default: { generateVAPIDKeys: () => generateVAPIDKeysMock() } }));

function mockEnv(overrides: Partial<{ VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_SUBJECT: string; WEB_ORIGIN: string }>) {
  vi.doMock("../../config/env.js", () => ({
    env: { WEB_ORIGIN: "https://panel.example", ...overrides },
  }));
}

function makeFakePrisma(existingRow: { key: string; value: string } | null = null) {
  const store = new Map<string, string>();
  if (existingRow) store.set(existingRow.key, existingRow.value);
  return {
    setting: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const value = store.get(where.key);
        return value ? { key: where.key, value } : null;
      }),
      create: vi.fn(async ({ data }: { data: { key: string; value: string } }) => {
        store.set(data.key, data.value);
        return data;
      }),
    },
  };
}

describe("resolveVapidKeys", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses explicit env vars when both are set, without touching the Setting table", async () => {
    mockEnv({ VAPID_PUBLIC_KEY: "env-pub", VAPID_PRIVATE_KEY: "env-priv" });
    const { resolveVapidKeys } = await import("./vapidKeys.js");
    const prisma = makeFakePrisma();

    const keys = await resolveVapidKeys(prisma as never);

    expect(keys).toEqual({ publicKey: "env-pub", privateKey: "env-priv", subject: "mailto:admin@panel.example" });
    expect(prisma.setting.findUnique).not.toHaveBeenCalled();
    expect(prisma.setting.create).not.toHaveBeenCalled();
  });

  it("reuses a previously generated pair from the Setting table instead of generating a new one", async () => {
    mockEnv({});
    const { resolveVapidKeys } = await import("./vapidKeys.js");
    const prisma = makeFakePrisma({ key: "vapid_keys", value: JSON.stringify({ publicKey: "stored-pub", privateKey: "stored-priv" }) });

    const keys = await resolveVapidKeys(prisma as never);

    expect(keys).toEqual({ publicKey: "stored-pub", privateKey: "stored-priv", subject: "mailto:admin@panel.example" });
    expect(generateVAPIDKeysMock).not.toHaveBeenCalled();
    expect(prisma.setting.create).not.toHaveBeenCalled();
  });

  it("generates and persists a new pair when nothing is configured or stored yet", async () => {
    mockEnv({});
    generateVAPIDKeysMock.mockReturnValue({ publicKey: "fresh-pub", privateKey: "fresh-priv" });
    const { resolveVapidKeys } = await import("./vapidKeys.js");
    const prisma = makeFakePrisma();

    const keys = await resolveVapidKeys(prisma as never);

    expect(keys).toEqual({ publicKey: "fresh-pub", privateKey: "fresh-priv", subject: "mailto:admin@panel.example" });
    expect(prisma.setting.create).toHaveBeenCalledWith({
      data: { key: "vapid_keys", value: JSON.stringify({ publicKey: "fresh-pub", privateKey: "fresh-priv" }) },
    });
  });

  it("respects an explicit VAPID_SUBJECT override instead of deriving one", async () => {
    mockEnv({ VAPID_PUBLIC_KEY: "env-pub", VAPID_PRIVATE_KEY: "env-priv", VAPID_SUBJECT: "mailto:custom@example.com" });
    const { resolveVapidKeys } = await import("./vapidKeys.js");
    const prisma = makeFakePrisma();

    const keys = await resolveVapidKeys(prisma as never);

    expect(keys.subject).toBe("mailto:custom@example.com");
  });
});

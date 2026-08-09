import { EventEmitter } from "node:events";
import type { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerActivityTracker, type PlayerActivityManager } from "./PlayerActivityTracker.js";

interface FakeProfileRow {
  id: string;
  serverId: string;
  usernameLower: string;
  username: string;
  uuid: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  lastIp: string | null;
  totalPlaytimeSeconds: number;
  currentSessionStartedAt: Date | null;
}

function makeFakePrisma(runningServerIds: string[] = []) {
  const rows = new Map<string, FakeProfileRow>();
  let nextId = 1;

  function key(serverId: string, usernameLower: string) {
    return `${serverId}:${usernameLower}`;
  }

  const playerProfile = {
    findUnique: vi.fn(async ({ where }: { where: { serverId_usernameLower: { serverId: string; usernameLower: string } } }) => {
      const row = rows.get(key(where.serverId_usernameLower.serverId, where.serverId_usernameLower.usernameLower));
      return row ? { ...row } : null;
    }),
    findMany: vi.fn(async ({ where }: { where: { serverId: string; currentSessionStartedAt?: { not: null } } }) => {
      return [...rows.values()].filter((r) => {
        if (r.serverId !== where.serverId) return false;
        if (where.currentSessionStartedAt && r.currentSessionStartedAt === null) return false;
        return true;
      });
    }),
    upsert: vi.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: { serverId_usernameLower: { serverId: string; usernameLower: string } };
        create: Partial<FakeProfileRow> & { serverId: string; usernameLower: string; username: string };
        update: Partial<FakeProfileRow>;
      }) => {
        const k = key(where.serverId_usernameLower.serverId, where.serverId_usernameLower.usernameLower);
        const existing = rows.get(k);
        if (!existing) {
          const row: FakeProfileRow = {
            id: `p${nextId++}`,
            uuid: null,
            firstSeenAt: null,
            lastSeenAt: null,
            lastIp: null,
            totalPlaytimeSeconds: 0,
            currentSessionStartedAt: null,
            ...create,
          } as FakeProfileRow;
          rows.set(k, row);
          return { ...row };
        }
        const updated = { ...existing, ...update };
        rows.set(k, updated);
        return { ...updated };
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id?: string; serverId_usernameLower?: { serverId: string; usernameLower: string } };
        data: Partial<FakeProfileRow>;
      }) => {
        const row = where.id
          ? [...rows.values()].find((r) => r.id === where.id)
          : where.serverId_usernameLower
            ? rows.get(key(where.serverId_usernameLower.serverId, where.serverId_usernameLower.usernameLower))
            : undefined;
        if (!row) throw new Error("No matching fake row for update()");
        const updated = { ...row, ...data };
        rows.set(key(updated.serverId, updated.usernameLower), updated);
        return { ...updated };
      },
    ),
  };

  const server = {
    findMany: vi.fn(async () => runningServerIds.map((id) => ({ id }))),
  };

  return { rows, playerProfile, server } as unknown as import("@prisma/client").PrismaClient & { rows: Map<string, FakeProfileRow> };
}

class FakeLogStream extends EventEmitter {
  destroyed = false;
  destroy() {
    this.destroyed = true;
  }
}

function makeFakeManager(streamsByServer: Map<string, FakeLogStream>, listResponses: Map<string, string>) {
  const emitter = new EventEmitter();
  const manager: PlayerActivityManager = {
    on: (event, listener) => emitter.on(event, listener),
    off: (event, listener) => emitter.off(event, listener),
    getLogStream: vi.fn(async (serverId: string) => {
      const stream = streamsByServer.get(serverId) ?? new FakeLogStream();
      streamsByServer.set(serverId, stream);
      return stream as unknown as Readable;
    }),
    sendCommand: vi.fn(async (serverId: string) => {
      const response = listResponses.get(serverId);
      if (response === undefined) throw new Error("RCON not ready");
      return response;
    }),
  };
  return { manager, emitStatus: (serverId: string, status: string) => emitter.emit("status", serverId, status) };
}

async function flush() {
  // Lets the tracker's fire-and-forget `void this.recordX(...)` promise chains (all synchronous fake-prisma resolutions) settle.
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

/** Waits until the tracker has actually attached its "data" listener to the stream (several microtask hops after start()/ensureTracking() — reconcile + getLogStream both await fake-but-async prisma/manager calls first). */
async function waitForListener(stream: FakeLogStream): Promise<void> {
  for (let i = 0; i < 50 && stream.listenerCount("data") === 0; i++) await Promise.resolve();
}

describe("PlayerActivityTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens a log stream and reconciles for every already-RUNNING server on start", async () => {
    const prisma = makeFakePrisma(["srv-1"]);
    const streams = new Map<string, FakeLogStream>();
    const { manager } = makeFakeManager(streams, new Map([["srv-1", "There are 0 of a max of 20 players online:"]]));
    const tracker = new PlayerActivityTracker(prisma, manager);

    tracker.start();
    await flush();

    expect(manager.getLogStream).toHaveBeenCalledWith("srv-1", { tail: 0 });
    tracker.stop();
  });

  it("records a join, backfills UUID and IP, then closes the session on leave with accumulated playtime", async () => {
    const prisma = makeFakePrisma(["srv-1"]);
    const streams = new Map<string, FakeLogStream>();
    const { manager } = makeFakeManager(streams, new Map([["srv-1", "There are 1 of a max of 20 players online: Steve"]]));
    const tracker = new PlayerActivityTracker(prisma, manager);

    tracker.start();
    await flush();
    const stream = streams.get("srv-1")!;
    await waitForListener(stream);

    stream.emit("data", Buffer.from("[12:00:00] [Server thread/INFO]: UUID of player Steve is a13f2c8e-9d41-4b7a-8c02-1e5f7b3d9a44\n"));
    stream.emit("data", Buffer.from("[12:00:00] [Server thread/INFO]: Steve[/203.0.113.11:54321] logged in with entity id 55 at (0, 64, 0)\n"));
    stream.emit("data", Buffer.from("[12:00:00] [Server thread/INFO]: Steve joined the game\n"));
    await flush();

    let row = prisma.rows.get("srv-1:steve");
    expect(row?.uuid).toBe("a13f2c8e-9d41-4b7a-8c02-1e5f7b3d9a44");
    expect(row?.lastIp).toBe("203.0.113.11");
    expect(row?.currentSessionStartedAt).not.toBeNull();
    expect(row?.firstSeenAt).not.toBeNull();

    vi.setSystemTime(Date.now() + 60_000);
    stream.emit("data", Buffer.from("[12:01:00] [Server thread/INFO]: Steve left the game\n"));
    await flush();

    row = prisma.rows.get("srv-1:steve");
    expect(row?.currentSessionStartedAt).toBeNull();
    expect(row?.totalPlaytimeSeconds).toBeGreaterThanOrEqual(60);

    tracker.stop();
  });

  it("ignores a chat message that merely contains the phrase 'joined the game'", async () => {
    const prisma = makeFakePrisma(["srv-1"]);
    const streams = new Map<string, FakeLogStream>();
    const { manager } = makeFakeManager(streams, new Map([["srv-1", "There are 0 of a max of 20 players online:"]]));
    const tracker = new PlayerActivityTracker(prisma, manager);

    tracker.start();
    await flush();
    const stream = streams.get("srv-1")!;
    await waitForListener(stream);
    stream.emit("data", Buffer.from("[12:00:00] [Server thread/INFO]: <Steve> hey I just joined the game\n"));
    await flush();

    expect(prisma.rows.size).toBe(0);
    tracker.stop();
  });

  it("reconciliation closes a session that vanished without a 'left the game' line (kick/crash)", async () => {
    const prisma = makeFakePrisma(["srv-1"]);
    const streams = new Map<string, FakeLogStream>();
    const listResponses = new Map([["srv-1", "There are 1 of a max of 20 players online: Steve"]]);
    const { manager } = makeFakeManager(streams, listResponses);
    const tracker = new PlayerActivityTracker(prisma, manager);

    tracker.start();
    await flush();
    const stream = streams.get("srv-1")!;
    await waitForListener(stream);
    stream.emit("data", Buffer.from("[12:00:00] [Server thread/INFO]: Steve joined the game\n"));
    await flush();
    expect(prisma.rows.get("srv-1:steve")?.currentSessionStartedAt).not.toBeNull();

    // Server no longer reports Steve online (kicked/crashed without a clean "left the game" line).
    listResponses.set("srv-1", "There are 0 of a max of 20 players online:");
    vi.setSystemTime(Date.now() + 60_000);
    await vi.advanceTimersByTimeAsync(60_000);
    await flush();

    expect(prisma.rows.get("srv-1:steve")?.currentSessionStartedAt).toBeNull();
    tracker.stop();
  });

  it("closes all open sessions when the server stops", async () => {
    const prisma = makeFakePrisma(["srv-1"]);
    const streams = new Map<string, FakeLogStream>();
    const { manager, emitStatus } = makeFakeManager(streams, new Map([["srv-1", "There are 1 of a max of 20 players online: Steve"]]));
    const tracker = new PlayerActivityTracker(prisma, manager);

    tracker.start();
    await flush();
    const stream = streams.get("srv-1")!;
    await waitForListener(stream);
    stream.emit("data", Buffer.from("[12:00:00] [Server thread/INFO]: Steve joined the game\n"));
    await flush();
    expect(prisma.rows.get("srv-1:steve")?.currentSessionStartedAt).not.toBeNull();

    emitStatus("srv-1", "STOPPED");
    await flush();

    expect(prisma.rows.get("srv-1:steve")?.currentSessionStartedAt).toBeNull();
    expect(stream.destroyed).toBe(true);
    tracker.stop();
  });
});

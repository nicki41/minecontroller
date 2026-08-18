import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MinecraftRuntime } from "./MinecraftServerManager.js";

// MinecraftServerManager resolves data paths via DATA_PATH and derives RCON
// passwords via SESSION_SECRET; point DATA_PATH at a fresh temp directory
// per test, same convention as files.service.test.ts.
vi.mock("../config/env.js", () => ({
  env: {
    get DATA_PATH() {
      return globalThis.__TEST_DATA_PATH__;
    },
    MC_PORT_RANGE_MIN: 30000,
    MC_PORT_RANGE_MAX: 30010,
    SESSION_SECRET: "a-fake-session-secret-for-tests-only",
  },
}));

declare global {
  // eslint-disable-next-line no-var
  var __TEST_DATA_PATH__: string;
}

const KNOWN_VERSIONS = [{ id: "1.21.1", releaseDate: "2024-08-08", type: "release" as const }];

vi.mock("./providers/index.js", () => ({
  getProvider: vi.fn(() => ({
    listVersions: vi.fn(async () => KNOWN_VERSIONS),
    resolveEnv: vi.fn(async (mcVersion: string) => ({ TYPE: "VANILLA", VERSION: mcVersion })),
    resolveInstallPlan: vi.fn(async (mcVersion: string) => ({
      kind: "direct-download",
      url: "https://piston-data.mojang.com/v1/objects/fake/server.jar",
      filename: "server.jar",
      sha1: "fake-sha1",
      javaMajor: 21,
      loaderVersion: null,
      mcVersion,
    })),
  })),
}));

// Shared (not per-instance) so tests can assert on them regardless of which
// MinecraftServerManager/ServerInstaller instance made the call — see
// Vitest's vi.hoisted() docs for why this is the safe way to reference
// mock fns from inside a (hoisted) vi.mock factory.
const { installerInstallMock, installerRefreshLaunchScriptMock } = vi.hoisted(() => ({
  installerInstallMock: vi.fn(async () => ({
    buildVersion: null as string | null,
    javaImageTag: "mcpanel-runtime:java21",
    installManifest: JSON.stringify({ kind: "direct-download", filename: "server.jar" }),
  })),
  installerRefreshLaunchScriptMock: vi.fn(async () => {}),
}));

vi.mock("./install/ServerInstaller.js", () => ({
  ServerInstaller: class {
    install = installerInstallMock;
    refreshLaunchScript = installerRefreshLaunchScriptMock;
  },
}));

const { MinecraftServerManager } = await import("./MinecraftServerManager.js");

/** In-memory stand-in for the slice of PrismaClient.server MinecraftServerManager actually calls. */
function makeFakePrisma() {
  const rows = new Map<string, Record<string, unknown>>();

  function apply(data: Record<string, unknown>, base: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      motd: "A Minecraft Server",
      maxPlayers: 20,
      difficulty: "normal",
      gamemode: "survival",
      whitelistEnabled: false,
      onlineMode: true,
      pvp: true,
      viewDistance: 10,
      simulationDistance: 10,
      status: "CREATING",
      statusDetail: null,
      containerId: null,
      diskLimitMb: null,
      description: null,
      // Matches the Prisma column default — tests that build rows directly
      // (not through the real createServer(), which always stamps
      // PANEL_MANAGED) exercise the legacy/RCON path unless they override
      // this, same as every pre-existing row in a real deployment.
      runtime: "LEGACY",
      javaImageTag: null,
      installManifest: null,
      buildVersion: null,
      ...base,
      ...data,
    };
  }

  return {
    rows,
    server: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = crypto.randomUUID();
        const row = { id, ...apply(data) };
        rows.set(id, row);
        return { ...row };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = rows.get(where.id);
        if (!existing) throw new Error(`No fake row for id ${where.id}`);
        const updated = { ...existing, ...data };
        rows.set(where.id, updated);
        return { ...updated };
      }),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; port?: number } }) => {
        if (where.id !== undefined) return rows.has(where.id) ? { ...rows.get(where.id)! } : null;
        if (where.port !== undefined) {
          const match = [...rows.values()].find((r) => r.port === where.port);
          return match ? { ...match } : null;
        }
        return null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = rows.get(where.id);
        if (!row) throw new Error(`No fake row for id ${where.id}`);
        return { ...row };
      }),
      findMany: vi.fn(async (args: { select?: { port?: boolean }; where?: Record<string, unknown> } = {}) => {
        let values = [...rows.values()];
        if (args.where?.containerId) values = values.filter((r) => r.containerId !== null);
        if (args.where?.status && typeof args.where.status === "object" && "notIn" in args.where.status) {
          const notIn = (args.where.status as { notIn: string[] }).notIn;
          values = values.filter((r) => !notIn.includes(r.status as string));
        }
        if (args.select?.port) return values.map((r) => ({ port: r.port }));
        return values.map((r) => ({ ...r }));
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        rows.delete(where.id);
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    // No test currently exercises extra port allocations — always empty,
    // same as a freshly migrated DB with no ServerAllocation rows yet.
    serverAllocation: {
      findMany: vi.fn(async () => []),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

/** Fake attach stream for AttachConsoleSession — tests grab this via runtime.getContainer(...) to emit console lines (e.g. Minecraft's ready line) or simulate the connection dying. */
function makeFakeAttachContainer(backlogText = "") {
  const stream = new EventEmitter() as EventEmitter & { write: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  stream.write = vi.fn();
  stream.destroy = vi.fn();
  return {
    logs: vi.fn(async () => Buffer.from(backlogText)),
    attach: vi.fn(async () => stream),
    __stream: stream,
  };
}

function makeFakeRuntime(overrides: Partial<MinecraftRuntime> = {}): MinecraftRuntime {
  const fakeContainer = makeFakeAttachContainer();
  return {
    createContainer: vi.fn(async () => "container-abc123"),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    restart: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    inspect: vi.fn(async () => ({
      State: { Running: true, Status: "running", ExitCode: 0, Error: "" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any,
    getStats: vi.fn(async () => null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getLogStream: vi.fn(async () => ({}) as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getContainer: vi.fn(() => fakeContainer as any),
    ...overrides,
  };
}

/** Emits Minecraft's own ready line on the given fake attach container, repeatedly, until the assertion inside vi.waitFor passes — robust against not knowing exactly when AttachConsoleSession finished registering its listener. */
async function emitReadyLineUntil(container: ReturnType<typeof makeFakeAttachContainer>, assertion: () => void | Promise<void>): Promise<void> {
  await vi.waitFor(
    async () => {
      container.__stream.emit("data", Buffer.from('Done (1.234s)! For help, type "help"\n'));
      await assertion();
    },
    { timeout: 2000, interval: 20 },
  );
}

describe("MinecraftServerManager", () => {
  let tmpDataPath: string;

  beforeEach(async () => {
    tmpDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "mcpanel-server-manager-"));
    globalThis.__TEST_DATA_PATH__ = tmpDataPath;
    installerInstallMock.mockClear();
    installerRefreshLaunchScriptMock.mockClear();
  });

  afterEach(async () => {
    await fs.rm(tmpDataPath, { recursive: true, force: true });
  });

  describe("createServer", () => {
    it("rejects a version that the provider doesn't know about", async () => {
      const prisma = makeFakePrisma();
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      await expect(
        manager.createServer({ name: "Test", software: "VANILLA", mcVersion: "99.99", memoryMb: 1024, cpuCores: 1, eulaAccepted: true }),
      ).rejects.toThrow(/unknown vanilla version/i);
      expect(prisma.server.create).not.toHaveBeenCalled();
    });

    it("rejects an explicit port already used by another server", async () => {
      const prisma = makeFakePrisma();
      await prisma.server.create({ data: { name: "Existing", software: "VANILLA", mcVersion: "1.21.1", containerName: "mcpanel-existing-aaaa0000", port: 30005, memoryMb: 1024, cpuCores: 1, dataDir: "servers/existing" } });
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      await expect(
        manager.createServer({ name: "Clash", software: "VANILLA", mcVersion: "1.21.1", memoryMb: 1024, cpuCores: 1, port: 30005, eulaAccepted: true }),
      ).rejects.toThrow(/already used/i);
    });

    it("allocates a free port from the configured range when none is requested", async () => {
      const prisma = makeFakePrisma();
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      const server = await manager.createServer({ name: "Auto Port", software: "VANILLA", mcVersion: "1.21.1", memoryMb: 1024, cpuCores: 1, eulaAccepted: true });
      expect(server.port).toBeGreaterThanOrEqual(30000);
      expect(server.port).toBeLessThanOrEqual(30010);
    });

    it("generates a containerName independent of the DB id and sets dataDir to servers/<id>", async () => {
      const prisma = makeFakePrisma();
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      const server = await manager.createServer({ name: "My Cool Server!", software: "VANILLA", mcVersion: "1.21.1", memoryMb: 1024, cpuCores: 1, eulaAccepted: true });
      expect(server.containerName).toMatch(/^mcpanel-my-cool-server-[0-9a-f]{8}$/);
      expect(server.dataDir).toBe(`servers/${server.id}`);
      const stat = await fs.stat(path.join(tmpDataPath, server.dataDir));
      expect(stat.isDirectory()).toBe(true);
    });

    it("provisions the container in the background and reaches RUNNING (PANEL_MANAGED — what createServer() always produces)", async () => {
      const prisma = makeFakePrisma();
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);
      const server = await manager.createServer({ name: "Boots Up", software: "VANILLA", mcVersion: "1.21.1", memoryMb: 2048, cpuCores: 2, eulaAccepted: true });

      expect(server.runtime).toBe("PANEL_MANAGED");
      const container = runtime.getContainer("container-abc123") as unknown as ReturnType<typeof makeFakeAttachContainer>;
      await emitReadyLineUntil(container, async () => {
        const row = await prisma.server.findUnique({ where: { id: server.id } });
        expect(row?.status).toBe("RUNNING");
      });

      expect(runtime.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: server.id,
          memoryMb: 2048,
          cpuCores: 2,
          runtime: "PANEL_MANAGED",
          javaImageTag: "mcpanel-runtime:java21",
        }),
      );
      expect(runtime.start).toHaveBeenCalledWith("container-abc123");

      const row = await prisma.server.findUnique({ where: { id: server.id } });
      expect(row?.buildVersion).toBeNull();
      expect(row?.javaImageTag).toBe("mcpanel-runtime:java21");

      // server.properties is written by the panel itself before the container
      // ever starts — see the note in DockerMinecraftRuntime.createContainer()
      // on why the image is never given MOTD/DIFFICULTY/etc env vars anymore.
      const properties = await fs.readFile(path.join(tmpDataPath, server.dataDir, "server.properties"), "utf8");
      expect(properties).toContain("motd=A Minecraft Server");
      expect(properties).toContain("max-players=20");
    });

    it("rejects createServer when the EULA was not accepted, without touching the DB", async () => {
      const prisma = makeFakePrisma();
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      await expect(
        manager.createServer({ name: "No Consent", software: "VANILLA", mcVersion: "1.21.1", memoryMb: 1024, cpuCores: 1, eulaAccepted: false }),
      ).rejects.toThrow(/eula/i);
      expect(prisma.server.create).not.toHaveBeenCalled();
    });

    it("never calls runtime.createContainer if the stored row somehow has eulaAccepted=false", async () => {
      // Defends the provisionInBackground() guard independently of the
      // createServer() input check above (e.g. against a future code path
      // that writes a Server row without going through createServer()).
      const prisma = makeFakePrisma();
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);
      const server = await prisma.server.create({
        data: {
          name: "Bad Row",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-bad-row-deadbeef",
          port: 30009,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/bad-row",
          eulaAccepted: false,
        },
      });

      await (manager as unknown as { provisionInBackground: (id: string, provider: unknown) => Promise<void> }).provisionInBackground(
        server.id as string,
        { resolveEnv: async () => ({ TYPE: "VANILLA" }) },
      );

      expect(runtime.createContainer).not.toHaveBeenCalled();
      const row = await prisma.server.findUnique({ where: { id: server.id as string } });
      expect(row?.status).toBe("ERROR");
    });

    it("marks the server ERROR if provisioning throws", async () => {
      const prisma = makeFakePrisma();
      const runtime = makeFakeRuntime({ createContainer: vi.fn(async () => { throw new Error("docker is down"); }) });
      const manager = new MinecraftServerManager(prisma as never, runtime);
      const server = await manager.createServer({ name: "Fails", software: "VANILLA", mcVersion: "1.21.1", memoryMb: 1024, cpuCores: 1, eulaAccepted: true });

      await vi.waitFor(async () => {
        const row = await prisma.server.findUnique({ where: { id: server.id } });
        expect(row?.status).toBe("ERROR");
      });
    });
  });

  describe("server lifecycle", () => {
    async function createRunningishServer(prisma: ReturnType<typeof makeFakePrisma>, extra: Record<string, unknown> = {}) {
      return prisma.server.create({
        data: {
          name: "Lifecycle",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-lifecycle-deadbeef",
          port: 30001,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/lifecycle",
          containerId: "container-existing",
          status: "STOPPED",
          ...extra,
        },
      });
    }

    it("startServer refuses a server with no container yet", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma, { containerId: null });
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      await expect(manager.startServer(server.id as string)).rejects.toThrow(/no container yet/i);
    });

    it("startServer moves through STARTING then RUNNING and calls runtime.start", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma);
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.startServer(server.id as string);
      expect(runtime.start).toHaveBeenCalledWith("container-existing");

      await vi.waitFor(async () => {
        const row = await prisma.server.findUnique({ where: { id: server.id as string } });
        expect(row?.status).toBe("RUNNING");
      });
    });

    it("stopServer transitions STOPPING -> STOPPED and calls runtime.stop", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma, { status: "RUNNING" });
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.stopServer(server.id as string);

      expect(runtime.stop).toHaveBeenCalledWith("container-existing");
      const row = await prisma.server.findUnique({ where: { id: server.id as string } });
      expect(row?.status).toBe("STOPPED");
    });

    it("stopServer refuses a server with no container yet", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma, { containerId: null });
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      await expect(manager.stopServer(server.id as string)).rejects.toThrow(/no container yet/i);
    });

    it("restartServer recreates the container (not a plain docker restart) so new resource limits/env actually apply", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma, { status: "RUNNING", memoryMb: 2048, cpuCores: 2 });
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.restartServer(server.id as string);

      expect(runtime.stop).toHaveBeenCalledWith("container-existing");
      expect(runtime.remove).toHaveBeenCalledWith("container-existing", true);
      expect(runtime.createContainer).toHaveBeenCalledWith(expect.objectContaining({ memoryMb: 2048, cpuCores: 2 }));
      expect(runtime.restart).not.toHaveBeenCalled();
      expect(runtime.start).toHaveBeenCalledWith("container-abc123");

      const [stopOrder] = vi.mocked(runtime.stop).mock.invocationCallOrder;
      const [removeOrder] = vi.mocked(runtime.remove).mock.invocationCallOrder;
      expect(stopOrder).toBeDefined();
      expect(removeOrder).toBeDefined();
      expect(stopOrder!).toBeLessThan(removeOrder!); // graceful stop must happen before the force-remove, not after

      await vi.waitFor(async () => {
        const row = await prisma.server.findUnique({ where: { id: server.id as string } });
        expect(row?.status).toBe("RUNNING");
        expect(row?.containerId).toBe("container-abc123");
      });
    });

    it("deleteServer removes the container, deletes the data directory, and drops the DB row", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma, { dataDir: "servers/to-delete" });
      await fs.mkdir(path.join(tmpDataPath, "servers/to-delete"), { recursive: true });
      await fs.writeFile(path.join(tmpDataPath, "servers/to-delete/world.dat"), "fake world data");

      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);
      await manager.deleteServer(server.id as string);

      expect(runtime.remove).toHaveBeenCalledWith("container-existing", true);
      await expect(fs.stat(path.join(tmpDataPath, "servers/to-delete"))).rejects.toThrow();
      expect(prisma.rows.has(server.id as string)).toBe(false);
    });

    it("deleteServer keeps files on disk when keepFiles is set", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma, { dataDir: "servers/keep-me" });
      await fs.mkdir(path.join(tmpDataPath, "servers/keep-me"), { recursive: true });

      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());
      await manager.deleteServer(server.id as string, { keepFiles: true });

      const stat = await fs.stat(path.join(tmpDataPath, "servers/keep-me"));
      expect(stat.isDirectory()).toBe(true);
    });

    it("deleteServer works even if the container was already removed out-of-band", async () => {
      const prisma = makeFakePrisma();
      const server = await createRunningishServer(prisma, { containerId: null, dataDir: "servers/no-container" });
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);
      await manager.deleteServer(server.id as string);
      expect(runtime.remove).not.toHaveBeenCalled();
      expect(prisma.rows.has(server.id as string)).toBe(false);
    });
  });

  describe("PANEL_MANAGED-specific behavior", () => {
    async function createPanelManagedServer(prisma: ReturnType<typeof makeFakePrisma>, extra: Record<string, unknown> = {}) {
      return prisma.server.create({
        data: {
          name: "Attach-based",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-attach-based-deadbeef",
          port: 30007,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/attach-based",
          containerId: "container-existing",
          status: "RUNNING",
          runtime: "PANEL_MANAGED",
          javaImageTag: "mcpanel-runtime:java21",
          installManifest: JSON.stringify({ kind: "direct-download", filename: "server.jar" }),
          ...extra,
        },
      });
    }

    it("sendCommand writes to the attach session instead of using RCON", async () => {
      const prisma = makeFakePrisma();
      const server = await createPanelManagedServer(prisma);
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      const pending = manager.sendCommand(server.id as string, "list");
      await vi.waitFor(() => {
        const container = runtime.getContainer("container-existing") as unknown as ReturnType<typeof makeFakeAttachContainer>;
        expect(container.__stream.write).toHaveBeenCalledWith("list\n");
      });

      const container = runtime.getContainer("container-existing") as unknown as ReturnType<typeof makeFakeAttachContainer>;
      container.__stream.emit("data", Buffer.from("There are 1 of a max of 20 players online: Alice\n"));
      await expect(pending).resolves.toBe("There are 1 of a max of 20 players online: Alice");
    });

    it("getLogStream returns backlog + live lines from the attach session, not docker logs --follow", async () => {
      const prisma = makeFakePrisma();
      const server = await createPanelManagedServer(prisma);
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      const stream = await manager.getLogStream(server.id as string);
      expect(runtime.getLogStream).not.toHaveBeenCalled();

      const chunks: string[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk.toString("utf8")));

      const container = runtime.getContainer("container-existing") as unknown as ReturnType<typeof makeFakeAttachContainer>;
      container.__stream.emit("data", Buffer.from("hello from the console\n"));

      await vi.waitFor(() => {
        expect(chunks.join("")).toContain("hello from the console");
      });
    });

    it("restartServer reuses the stored javaImageTag (never re-resolves a build) and refreshes the launch script for the current memoryMb", async () => {
      const prisma = makeFakePrisma();
      const server = await createPanelManagedServer(prisma, { memoryMb: 4096 });
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.restartServer(server.id as string);

      expect(installerRefreshLaunchScriptMock).toHaveBeenCalledWith(expect.objectContaining({ memoryMb: 4096 }));
      expect(runtime.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({ runtime: "PANEL_MANAGED", javaImageTag: "mcpanel-runtime:java21", memoryMb: 4096 }),
      );
      // No env-var/RCON hint resolution for this runtime kind at all.
      expect(runtime.createContainer).toHaveBeenCalledWith(expect.not.objectContaining({ softwareEnv: expect.anything() }));
    });

    it("restartServer refuses a PANEL_MANAGED server that somehow has no javaImageTag, rather than guessing", async () => {
      const prisma = makeFakePrisma();
      const server = await createPanelManagedServer(prisma, { javaImageTag: null });
      const manager = new MinecraftServerManager(prisma as never, makeFakeRuntime());

      await expect(manager.restartServer(server.id as string)).rejects.toThrow(/no installed runtime image/i);
    });
  });

  describe("reconcile", () => {
    it("flips a server to ERROR when its container has disappeared", async () => {
      const prisma = makeFakePrisma();
      const server = await prisma.server.create({
        data: {
          name: "Vanished",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-vanished-deadbeef",
          port: 30002,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/vanished",
          containerId: "container-gone",
          status: "RUNNING",
        },
      });
      const runtime = makeFakeRuntime({ inspect: vi.fn(async () => null) });
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.reconcile();

      const row = await prisma.server.findUnique({ where: { id: server.id as string } });
      expect(row?.status).toBe("ERROR");
    });

    it("flips a RUNNING server to ERROR when Docker reports it exited non-zero (e.g. crash/OOM kill)", async () => {
      const prisma = makeFakePrisma();
      const server = await prisma.server.create({
        data: {
          name: "Crashed",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-crashed-deadbeef",
          port: 30003,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/crashed",
          containerId: "container-crashed",
          status: "RUNNING",
        },
      });
      const runtime = makeFakeRuntime({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inspect: vi.fn(async () => ({ State: { Running: false, Status: "exited", ExitCode: 137, Error: "" } })) as any,
      });
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.reconcile();

      const row = await prisma.server.findUnique({ where: { id: server.id as string } });
      expect(row?.status).toBe("ERROR");
    });

    it("leaves an intentionally-STOPPED server alone even if it exited non-zero (e.g. SIGKILLed after the stop timeout)", async () => {
      const prisma = makeFakePrisma();
      const server = await prisma.server.create({
        data: {
          name: "SlowShutdown",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-slowshutdown-deadbeef",
          port: 30005,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/slowshutdown",
          containerId: "container-slowshutdown",
          status: "STOPPED",
        },
      });
      const runtime = makeFakeRuntime({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inspect: vi.fn(async () => ({ State: { Running: false, Status: "exited", ExitCode: 137, Error: "" } })) as any,
      });
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.reconcile();

      expect(prisma.server.update).not.toHaveBeenCalled();
      const row = await prisma.server.findUnique({ where: { id: server.id as string } });
      expect(row?.status).toBe("STOPPED");
    });

    it("leaves a RUNNING server alone when Docker agrees it's still running", async () => {
      const prisma = makeFakePrisma();
      const server = await prisma.server.create({
        data: {
          name: "Healthy",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-healthy-deadbeef",
          port: 30004,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/healthy",
          containerId: "container-healthy",
          status: "RUNNING",
        },
      });
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.reconcile();

      expect(prisma.server.update).not.toHaveBeenCalled();
      const row = await prisma.server.findUnique({ where: { id: server.id as string } });
      expect(row?.status).toBe("RUNNING");
    });

    it("skips servers mid-transition (CREATING/STARTING/etc.) so it never races the manager's own lifecycle calls", async () => {
      const prisma = makeFakePrisma();
      await prisma.server.create({
        data: {
          name: "Starting",
          software: "VANILLA",
          mcVersion: "1.21.1",
          containerName: "mcpanel-starting-deadbeef",
          port: 30006,
          memoryMb: 1024,
          cpuCores: 1,
          dataDir: "servers/starting",
          containerId: "container-starting",
          status: "STARTING",
        },
      });
      const runtime = makeFakeRuntime();
      const manager = new MinecraftServerManager(prisma as never, runtime);

      await manager.reconcile();

      expect(runtime.inspect).not.toHaveBeenCalled();
    });
  });
});

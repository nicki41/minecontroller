import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { EventEmitter } from "node:events";
import type { Readable } from "node:stream";
import type { PrismaClient, Server } from "@prisma/client";
import type { ServerSoftware, ServerStatus } from "@minecraftpanel/shared";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { getDirectorySize } from "../lib/fsUtils.js";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors.js";
import { getProvider, type MinecraftServerProvider } from "./providers/index.js";
import {
  CONTAINER_RCON_PORT,
  DockerMinecraftRuntime,
  type ContainerStats,
  type CreateContainerOptions,
} from "./runtime/DockerMinecraftRuntime.js";
import { RconClient } from "./runtime/RconClient.js";
import { deriveRconPassword } from "./runtime/rconSecret.js";
import { ServerConfigService } from "../modules/serverConfig/serverConfig.service.js";
import type Docker from "dockerode";
import type { Readable as NodeReadable } from "node:stream";

/** The subset of DockerMinecraftRuntime that MinecraftServerManager depends on — extracted so tests can inject a fake without touching a real Docker daemon. */
export interface MinecraftRuntime {
  createContainer(options: CreateContainerOptions): Promise<string>;
  start(containerId: string): Promise<void>;
  stop(containerId: string, timeoutSeconds?: number): Promise<void>;
  restart(containerId: string, timeoutSeconds?: number): Promise<void>;
  remove(containerId: string, force?: boolean): Promise<void>;
  inspect(containerId: string): Promise<Docker.ContainerInspectInfo | null>;
  getStats(containerId: string): Promise<ContainerStats | null>;
  getLogStream(containerId: string, options?: { tail?: number; since?: number }): Promise<NodeReadable>;
}

export interface CreateServerInput {
  name: string;
  description?: string;
  software: ServerSoftware;
  mcVersion: string;
  memoryMb: number;
  cpuCores: number;
  diskLimitMb?: number;
  port?: number;
  /** Must be true — enforced by createServerSchema (z.literal(true)) before this ever reaches here; re-checked defensively below. */
  eulaAccepted: boolean;
}

export interface UpdateServerSettingsInput {
  name?: string;
  description?: string | null;
  memoryMb?: number;
  cpuCores?: number;
  diskLimitMb?: number | null;
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "server";
}

function generateContainerName(serverName: string): string {
  return `mcpanel-${slugify(serverName)}-${crypto.randomBytes(4).toString("hex")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MinecraftServerManager {
  on(event: "status", listener: (serverId: string, status: ServerStatus) => void): this;
  emit(event: "status", serverId: string, status: ServerStatus): boolean;
}

/**
 * Owns the full server lifecycle (create/install/start/stop/restart/
 * delete), port allocation, and status reconciliation against Docker's
 * actual state. Talks to Docker exclusively through DockerMinecraftRuntime
 * and to version metadata exclusively through the provider registry —
 * nothing else in the app touches either directly.
 */
export class MinecraftServerManager extends EventEmitter {
  private readonly runtime: MinecraftRuntime;
  private readonly configService = new ServerConfigService();
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    runtime: MinecraftRuntime = new DockerMinecraftRuntime(),
  ) {
    super();
    this.runtime = runtime;
  }

  startReconciler(intervalMs = 5000): void {
    if (this.reconcileTimer) return;
    this.reconcileTimer = setInterval(() => {
      this.reconcile().catch((err) => logger.error({ err }, "Server status reconcile failed"));
    }, intervalMs);
    this.reconcileTimer.unref?.();
  }

  stopReconciler(): void {
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
    this.reconcileTimer = null;
  }

  async listVersions(software: ServerSoftware) {
    return getProvider(software).listVersions();
  }

  async createServer(input: CreateServerInput): Promise<Server> {
    // Defensive re-check: createServerSchema already requires this to be the
    // literal `true`, but createServer() is a public method other code could
    // call directly, so never fall back to "accepted" here either.
    if (input.eulaAccepted !== true) {
      throw new BadRequestError("The Minecraft EULA must be explicitly accepted to create a server.");
    }

    const provider = getProvider(input.software);
    const versions = await provider.listVersions();
    if (!versions.some((v) => v.id === input.mcVersion)) {
      throw new BadRequestError(`Unknown ${input.software} version: ${input.mcVersion}`);
    }

    const port = input.port ?? (await this.allocateFreePort());
    await this.assertPortAvailable(port);

    const server = await this.prisma.server.create({
      data: {
        name: input.name,
        description: input.description,
        software: input.software,
        mcVersion: input.mcVersion,
        containerName: generateContainerName(input.name),
        port,
        memoryMb: input.memoryMb,
        cpuCores: input.cpuCores,
        diskLimitMb: input.diskLimitMb,
        status: "CREATING",
        dataDir: "servers/pending", // replaced immediately below once we know the id
        eulaAccepted: true,
      },
    });

    const dataDir = `servers/${server.id}`;
    await this.prisma.server.update({ where: { id: server.id }, data: { dataDir } });
    await fs.mkdir(this.absoluteDataPath(dataDir), { recursive: true });

    this.provisionInBackground(server.id, provider).catch((err) => {
      logger.error({ err, serverId: server.id }, "Server provisioning failed");
      this.updateStatus(server.id, "ERROR", { statusDetail: "Provisioning failed unexpectedly. Check server logs." }).catch(() => {});
    });

    return { ...server, dataDir };
  }

  async startServer(serverId: string): Promise<void> {
    const server = await this.requireServer(serverId);
    if (!server.containerId) throw new ConflictError("Server has no container yet.");
    await this.updateStatus(serverId, "STARTING");
    await this.runtime.start(server.containerId);
    this.waitUntilRunningOrFailed(serverId, server.containerId).catch((err) =>
      logger.error({ err, serverId }, "Post-start reconcile failed"),
    );
  }

  async stopServer(serverId: string): Promise<void> {
    const server = await this.requireServer(serverId);
    if (!server.containerId) throw new ConflictError("Server has no container yet.");
    await this.updateStatus(serverId, "STOPPING");
    await this.runtime.stop(server.containerId);
    await this.updateStatus(serverId, "STOPPED");
  }

  /**
   * Always recreates the container (stop + remove + create + start) rather
   * than a plain `docker restart` — Docker freezes a container's env vars
   * and HostConfig (memory/CPU limits) at creation time, so a plain restart
   * would silently keep serving the OLD resource limits even after the DB
   * row (and thus Settings → Resources) says otherwise. Recreating with the
   * *current* DB values on every restart is what makes "Restart" actually
   * mean "apply my latest settings" — the bind-mounted data directory (and
   * therefore server.properties, worlds, plugins, etc.) is untouched either
   * way, since none of that lives in the container's own writable layer.
   */
  async restartServer(serverId: string): Promise<void> {
    const server = await this.requireServer(serverId);
    if (!server.containerId) throw new ConflictError("Server has no container yet.");
    await this.updateStatus(serverId, "STOPPING");
    await this.recreateContainer(server);
    const updated = await this.requireServer(serverId);
    await this.runtime.start(updated.containerId!);
    this.waitUntilRunningOrFailed(serverId, updated.containerId!).catch((err) =>
      logger.error({ err, serverId }, "Post-restart reconcile failed"),
    );
  }

  private async recreateContainer(server: Server): Promise<void> {
    const provider = getProvider(server.software as ServerSoftware);
    const softwareEnv = await provider.resolveEnv(server.mcVersion);
    const rconPassword = deriveRconPassword(server.id);

    await this.runtime.remove(server.containerId!, true);
    const containerId = await this.runtime.createContainer({
      serverId: server.id,
      containerName: server.containerName,
      softwareEnv,
      mcVersion: server.mcVersion,
      hostPort: server.port,
      memoryMb: server.memoryMb,
      cpuCores: server.cpuCores,
      rconPassword,
      eulaAccepted: server.eulaAccepted,
    });
    await this.prisma.server.update({ where: { id: server.id }, data: { containerId } });
  }

  async deleteServer(serverId: string, options: { keepFiles?: boolean } = {}): Promise<void> {
    const server = await this.requireServer(serverId);
    await this.updateStatus(serverId, "DELETING");

    if (server.containerId) {
      await this.runtime.remove(server.containerId, true);
    }
    if (!options.keepFiles) {
      await fs.rm(this.absoluteDataPath(server.dataDir), { recursive: true, force: true }).catch((err) => {
        logger.warn({ err, serverId }, "Failed to remove server data directory");
      });
    }
    await this.prisma.server.delete({ where: { id: serverId } });
  }

  async updateSettings(serverId: string, input: UpdateServerSettingsInput): Promise<Server> {
    const server = await this.requireServer(serverId);
    const updated = await this.prisma.server.update({ where: { id: serverId }, data: input });

    // Resource limits are baked into the container at creation time; they
    // only take effect once restartServer() recreates the container with
    // these new values. That's communicated in the UI (the restart-required
    // dialog) rather than force-restarting a running server out from under
    // players.
    if (server.memoryMb !== updated.memoryMb || server.cpuCores !== updated.cpuCores) {
      logger.info({ serverId }, "Resource limits changed; will apply on next restart");
    }
    return updated;
  }

  async getStats(serverId: string): Promise<ContainerStats | null> {
    const server = await this.requireServer(serverId);
    if (!server.containerId) return null;
    return this.runtime.getStats(server.containerId);
  }

  async getDiskUsageBytes(serverId: string): Promise<number> {
    const server = await this.requireServer(serverId);
    return getDirectorySize(this.absoluteDataPath(server.dataDir));
  }

  async getLogStream(serverId: string, options: { tail?: number } = {}): Promise<Readable> {
    const server = await this.requireServer(serverId);
    if (!server.containerId) throw new ConflictError("Server has no container yet.");
    return this.runtime.getLogStream(server.containerId, options);
  }

  createRconClient(server: Pick<Server, "id" | "containerName">): RconClient {
    return new RconClient(server.containerName, CONTAINER_RCON_PORT, deriveRconPassword(server.id));
  }

  /** Best-effort: not every command needs a reply the caller cares about (e.g. console input echoed from the UI). */
  async sendCommand(serverId: string, command: string): Promise<string> {
    const server = await this.requireServer(serverId);
    if (server.status !== "RUNNING") throw new ConflictError("Server is not running.");
    const rcon = this.createRconClient(server);
    try {
      return await rcon.send(command);
    } finally {
      rcon.disconnect();
    }
  }

  /** Re-derives the resolveEnv() the running container was actually created with — used by installers/plugin logic that need to know the loader family. */
  async resolveProviderEnv(server: Pick<Server, "software" | "mcVersion">): Promise<Record<string, string>> {
    return getProvider(server.software as ServerSoftware).resolveEnv(server.mcVersion);
  }

  /** Periodic safety net: reconciles DB status against real Docker state (crashes, OOM kills, manual `docker stop`, etc.). */
  async reconcile(): Promise<void> {
    const servers = await this.prisma.server.findMany({
      where: { containerId: { not: null }, status: { notIn: ["CREATING", "DELETING", "INSTALLING", "STARTING", "STOPPING"] } },
    });

    for (const server of servers) {
      try {
        const info = await this.runtime.inspect(server.containerId!);
        const next = mapDockerStateToStatus(info, server.status as ServerStatus);
        if (next && next !== server.status) {
          await this.updateStatus(server.id, next, next === "ERROR" ? { statusDetail: info?.State.Error || undefined } : {});
        }
      } catch (err) {
        logger.error({ err, serverId: server.id }, "Failed to reconcile server status");
      }
    }
  }

  private async provisionInBackground(serverId: string, provider: MinecraftServerProvider): Promise<void> {
    const server = await this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
    if (!server.eulaAccepted) {
      await this.updateStatus(serverId, "ERROR", { statusDetail: "Minecraft EULA was not accepted; the server was not provisioned." });
      return;
    }
    // Owns server.properties from the very start: written before the
    // container ever boots, and — since createContainer() no longer passes
    // any of the corresponding env vars — never touched by the image
    // itself afterward. See the note in DockerMinecraftRuntime.createContainer().
    await this.configService.createWithDefaults(server, "server-properties");

    const softwareEnv = await provider.resolveEnv(server.mcVersion);
    const rconPassword = deriveRconPassword(server.id);

    const containerId = await this.runtime.createContainer({
      serverId: server.id,
      containerName: server.containerName,
      softwareEnv,
      mcVersion: server.mcVersion,
      hostPort: server.port,
      memoryMb: server.memoryMb,
      cpuCores: server.cpuCores,
      rconPassword,
      eulaAccepted: server.eulaAccepted,
    });

    await this.updateStatus(serverId, "INSTALLING", { containerId });
    await this.runtime.start(containerId);
    await this.waitUntilRunningOrFailed(serverId, containerId, 15 * 60 * 1000); // modded servers can take a while to install
  }

  private async waitUntilRunningOrFailed(serverId: string, containerId: string, timeoutMs = 5 * 60 * 1000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const info = await this.runtime.inspect(containerId);
      if (!info) {
        await this.updateStatus(serverId, "ERROR", { statusDetail: "Container disappeared while starting." });
        return;
      }
      if (info.State.Running) {
        await this.updateStatus(serverId, "RUNNING");
        return;
      }
      if (info.State.Status === "exited") {
        const detail = info.State.ExitCode === 0 ? null : `Container exited with code ${info.State.ExitCode}.`;
        await this.updateStatus(serverId, detail ? "ERROR" : "STOPPED", { statusDetail: detail });
        return;
      }
      await sleep(2000);
    }
    await this.updateStatus(serverId, "ERROR", { statusDetail: "Timed out waiting for the server to become ready." });
  }

  private async updateStatus(
    serverId: string,
    status: ServerStatus,
    extra: { containerId?: string; statusDetail?: string | null } = {},
  ): Promise<void> {
    await this.prisma.server.update({
      where: { id: serverId },
      data: {
        status,
        statusDetail: extra.statusDetail !== undefined ? extra.statusDetail : status === "ERROR" ? undefined : null,
        ...(extra.containerId ? { containerId: extra.containerId } : {}),
      },
    });
    this.emit("status", serverId, status);
  }

  private async allocateFreePort(): Promise<number> {
    const used = new Set((await this.prisma.server.findMany({ select: { port: true } })).map((s) => s.port));
    for (let port = env.MC_PORT_RANGE_MIN; port <= env.MC_PORT_RANGE_MAX; port++) {
      if (!used.has(port)) return port;
    }
    throw new ConflictError("No free ports left in the configured MC_PORT_RANGE_MIN..MC_PORT_RANGE_MAX range.");
  }

  private async assertPortAvailable(port: number, excludeServerId?: string): Promise<void> {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new BadRequestError("Port must be an integer between 1 and 65535.");
    }
    const existing = await this.prisma.server.findUnique({ where: { port } });
    if (existing && existing.id !== excludeServerId) {
      throw new ConflictError(`Port ${port} is already used by another server.`);
    }
  }

  private async requireServer(serverId: string): Promise<Server> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundError("Server not found.");
    return server;
  }

  private absoluteDataPath(relativeDataDir: string): string {
    return path.join(env.DATA_PATH, relativeDataDir);
  }
}

function mapDockerStateToStatus(
  info: Awaited<ReturnType<DockerMinecraftRuntime["inspect"]>>,
  current: ServerStatus,
): ServerStatus | null {
  if (!info) return "ERROR";
  if (info.State.Running) return current === "RUNNING" ? null : "RUNNING";
  if (info.State.Status === "exited") {
    return info.State.ExitCode === 0 ? (current === "STOPPED" ? null : "STOPPED") : "ERROR";
  }
  return null;
}

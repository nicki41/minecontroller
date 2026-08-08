import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createServerSchema,
  effectiveServerPermissions,
  updateServerSettingsSchema,
  SERVER_SOFTWARE,
  type AccessLevel,
  type ServerStatsDto,
} from "@minecraftpanel/shared";
import { AuditAction } from "../audit/audit.service.js";
import { BackupService } from "../backups/backups.service.js";
import { serializeServer } from "./servers.serialize.js";

const versionsQuerySchema = z.object({ software: z.enum(SERVER_SOFTWARE) });
const deleteQuerySchema = z.object({ keepFiles: z.coerce.boolean().optional().default(false) });
const historyQuerySchema = z.object({ range: z.enum(["5m", "15m", "1h", "6h", "24h"]).default("1h") });

export async function serversRoutes(fastify: FastifyInstance) {
  const backupService = new BackupService(fastify.prisma);

  fastify.get("/versions", { preHandler: fastify.requirePermission("servers.create") }, async (request, reply) => {
    const { software } = versionsQuerySchema.parse(request.query);
    const versions = await fastify.serverManager.listVersions(software);
    return reply.send({ versions });
  });

  fastify.get("/", { preHandler: fastify.requirePermission("servers.view") }, async (request, reply) => {
    const user = request.user!;
    const servers = await fastify.prisma.server.findMany({ orderBy: { createdAt: "desc" } });

    if (user.isOwner) {
      return reply.send({ servers: servers.map((s) => serializeServer(s, "FULL")) });
    }

    const accessRows = await fastify.prisma.serverAccess.findMany({ where: { userId: user.id } });
    const accessByServerId = new Map(accessRows.map((a) => [a.serverId, a.level]));

    const visible = servers
      .map((server) => {
        const level = (accessByServerId.get(server.id) as AccessLevel | undefined) ?? null;
        const effective = effectiveServerPermissions([...user.permissions], level);
        return effective.has("servers.view") ? serializeServer(server, level!) : null;
      })
      .filter((s) => s !== null);

    return reply.send({ servers: visible });
  });

  fastify.post("/", { preHandler: fastify.requirePermission("servers.create") }, async (request, reply) => {
    const input = createServerSchema.parse(request.body);
    const server = await fastify.serverManager.createServer(input);

    await fastify.audit.record(AuditAction.SERVER_CREATE, {
      userId: request.user!.id,
      serverId: server.id,
      ipAddress: request.ip,
    }, { name: input.name, software: input.software, mcVersion: input.mcVersion });

    return reply.status(201).send({ server: serializeServer(server, "FULL") });
  });

  fastify.get("/:id", { preHandler: fastify.requireServerAccess("servers.view") }, async (request, reply) => {
    return reply.send({ server: serializeServer(request.mcServer!, request.serverAccessLevel ?? "FULL") });
  });

  fastify.get("/:id/stats", { preHandler: fastify.requireServerAccess("servers.view") }, async (request, reply) => {
    const serverId = request.mcServer!.id;
    const [stats, diskUsageBytes] = await Promise.all([
      fastify.serverManager.getStats(serverId),
      fastify.serverManager.getDiskUsageBytes(serverId),
    ]);
    const body: ServerStatsDto = {
      cpuPercent: stats?.cpuPercent ?? 0,
      memoryUsageBytes: stats?.memoryUsageBytes ?? 0,
      memoryLimitBytes: stats?.memoryLimitBytes ?? request.mcServer!.memoryMb * 1024 * 1024,
      diskUsageBytes,
      networkRxBytes: stats?.networkRxBytes ?? 0,
      networkTxBytes: stats?.networkTxBytes ?? 0,
      startedAt: stats?.startedAt ?? null,
    };
    return reply.send(body);
  });

  fastify.get("/:id/stats/history", { preHandler: fastify.requireServerAccess("servers.view") }, async (request, reply) => {
    const { range } = historyQuerySchema.parse(request.query);
    const samples = fastify.metricsHistory.getRange(request.mcServer!.id, range);
    return reply.send({ range, samples });
  });

  fastify.patch("/:id/settings", { preHandler: fastify.requireServerAccess("servers.settings.edit") }, async (request, reply) => {
    const input = updateServerSettingsSchema.parse(request.body);
    const server = await fastify.serverManager.updateSettings(request.mcServer!.id, input);

    await fastify.audit.record(AuditAction.SERVER_SETTINGS_UPDATE, {
      userId: request.user!.id,
      serverId: server.id,
      ipAddress: request.ip,
    }, input);

    return reply.send({ server: serializeServer(server, request.serverAccessLevel ?? "FULL") });
  });

  fastify.post("/:id/start", { preHandler: fastify.requireServerAccess("servers.start") }, async (request, reply) => {
    await fastify.serverManager.startServer(request.mcServer!.id);
    await fastify.audit.record(AuditAction.SERVER_START, { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip });
    return reply.status(204).send();
  });

  fastify.post("/:id/stop", { preHandler: fastify.requireServerAccess("servers.stop") }, async (request, reply) => {
    await fastify.serverManager.stopServer(request.mcServer!.id);
    await fastify.audit.record(AuditAction.SERVER_STOP, { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip });
    return reply.status(204).send();
  });

  fastify.post("/:id/restart", { preHandler: fastify.requireServerAccess("servers.restart") }, async (request, reply) => {
    await fastify.serverManager.restartServer(request.mcServer!.id);
    await fastify.audit.record(AuditAction.SERVER_RESTART, { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip });
    return reply.status(204).send();
  });

  fastify.delete("/:id", { preHandler: fastify.requireServerAccess("servers.delete") }, async (request, reply) => {
    const { keepFiles } = deleteQuerySchema.parse(request.query);
    const serverId = request.mcServer!.id;
    const name = request.mcServer!.name;

    await fastify.serverManager.deleteServer(serverId, { keepFiles });
    await backupService.deleteAllForServer(serverId);
    fastify.metricsHistory.clear(serverId);

    await fastify.audit.record(AuditAction.SERVER_DELETE, {
      userId: request.user!.id,
      serverId: null, // the server row is gone; keep the log entry from dangling on a FK that no longer resolves
      ipAddress: request.ip,
    }, { serverId, name, keptFiles: keepFiles });

    return reply.status(204).send();
  });
}

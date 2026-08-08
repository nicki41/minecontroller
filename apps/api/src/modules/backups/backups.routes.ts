import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { createBackupSchema } from "@minecraftpanel/shared";
import { BackupService } from "./backups.service.js";
import { AuditAction } from "../audit/audit.service.js";

export async function backupsRoutes(fastify: FastifyInstance) {
  const backupService = new BackupService(fastify.prisma);

  fastify.get("/", { preHandler: fastify.requireServerAccess("backups.view") }, async (request, reply) => {
    const backups = await backupService.list(request.mcServer!.id);
    return reply.send({ backups });
  });

  fastify.post("/", { preHandler: fastify.requireServerAccess("backups.create") }, async (request, reply) => {
    const { note } = createBackupSchema.parse(request.body ?? {});
    const backup = await backupService.create(request.mcServer!, note, request.user!.id);

    await fastify.audit.record(
      AuditAction.BACKUP_CREATE,
      { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
      { backupId: backup.id, fileName: backup.fileName },
    );
    return reply.status(201).send({ backup });
  });

  fastify.get("/:backupId/download", { preHandler: fastify.requireServerAccess("backups.view") }, async (request, reply) => {
    const { backupId } = request.params as { backupId: string };
    const { path: filePath, fileName } = await backupService.getFilePath(request.mcServer!.id, backupId);

    reply.header("Content-Disposition", `attachment; filename="${fileName.replace(/"/g, "")}"`);
    reply.type("application/gzip");
    return reply.send(fs.createReadStream(filePath));
  });

  fastify.post("/:backupId/restore", { preHandler: fastify.requireServerAccess("backups.restore") }, async (request, reply) => {
    const { backupId } = request.params as { backupId: string };
    await backupService.restore(request.mcServer!, backupId);

    await fastify.audit.record(
      AuditAction.BACKUP_RESTORE,
      { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
      { backupId },
    );
    return reply.status(204).send();
  });

  fastify.delete("/:backupId", { preHandler: fastify.requireServerAccess("backups.delete") }, async (request, reply) => {
    const { backupId } = request.params as { backupId: string };
    await backupService.delete(request.mcServer!.id, backupId);

    await fastify.audit.record(
      AuditAction.BACKUP_DELETE,
      { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
      { backupId },
    );
    return reply.status(204).send();
  });
}

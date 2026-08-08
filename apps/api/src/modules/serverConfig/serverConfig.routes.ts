import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AuditAction } from "../audit/audit.service.js";
import { ServerConfigService } from "./serverConfig.service.js";

const paramsSchema = z.object({ fileId: z.string().min(1) });
const updateBodySchema = z.object({ values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) });

export async function serverConfigRoutes(fastify: FastifyInstance) {
  const service = new ServerConfigService();

  fastify.get("/:fileId", { preHandler: fastify.requireServerAccess("servers.view") }, async (request, reply) => {
    const { fileId } = paramsSchema.parse(request.params);
    const result = await service.readValues(request.mcServer!, fileId);
    return reply.send(result);
  });

  fastify.patch("/:fileId", { preHandler: fastify.requireServerAccess("servers.settings.edit") }, async (request, reply) => {
    const { fileId } = paramsSchema.parse(request.params);
    const { values } = updateBodySchema.parse(request.body);
    const server = request.mcServer!;

    const result = await service.writeValues(server, fileId, values);

    await fastify.audit.record(
      AuditAction.SERVER_CONFIG_UPDATE,
      { userId: request.user!.id, serverId: server.id, ipAddress: request.ip },
      { fileId, keys: Object.keys(values) },
    );

    return reply.send(result);
  });
}

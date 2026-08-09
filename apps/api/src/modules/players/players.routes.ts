import type { FastifyInstance } from "fastify";
import { banPlayerSchema, messagePlayerSchema } from "@minecraftpanel/shared";
import { PlayerService } from "./players.service.js";
import { AuditAction } from "../audit/audit.service.js";

export async function playersRoutes(fastify: FastifyInstance) {
  const playerService = new PlayerService(fastify.serverManager, fastify.prisma);

  fastify.get("/", { preHandler: fastify.requireServerAccess("players.view") }, async (request, reply) => {
    const players = await playerService.list(request.mcServer!);
    return reply.send({ players });
  });

  fastify.post("/:username/op", { preHandler: fastify.requireServerAccess("players.op") }, async (request, reply) => {
    const { username } = request.params as { username: string };
    await playerService.op(request.mcServer!, username);
    await fastify.audit.record(AuditAction.PLAYER_OP, { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip }, { username });
    return reply.status(204).send();
  });

  fastify.post("/:username/deop", { preHandler: fastify.requireServerAccess("players.op") }, async (request, reply) => {
    const { username } = request.params as { username: string };
    await playerService.deop(request.mcServer!, username);
    await fastify.audit.record(AuditAction.PLAYER_DEOP, { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip }, { username });
    return reply.status(204).send();
  });

  fastify.post(
    "/:username/whitelist",
    { preHandler: fastify.requireServerAccess("players.whitelist") },
    async (request, reply) => {
      const { username } = request.params as { username: string };
      await playerService.whitelistAdd(request.mcServer!, username);
      await fastify.audit.record(
        AuditAction.PLAYER_WHITELIST_ADD,
        { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
        { username },
      );
      return reply.status(204).send();
    },
  );

  fastify.delete(
    "/:username/whitelist",
    { preHandler: fastify.requireServerAccess("players.whitelist") },
    async (request, reply) => {
      const { username } = request.params as { username: string };
      await playerService.whitelistRemove(request.mcServer!, username);
      await fastify.audit.record(
        AuditAction.PLAYER_WHITELIST_REMOVE,
        { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
        { username },
      );
      return reply.status(204).send();
    },
  );

  fastify.post("/:username/kick", { preHandler: fastify.requireServerAccess("players.kick") }, async (request, reply) => {
    const { username } = request.params as { username: string };
    const { reason } = banPlayerSchema.parse(request.body ?? {});
    await playerService.kick(request.mcServer!, username, reason);
    await fastify.audit.record(
      AuditAction.PLAYER_KICK,
      { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
      { username, reason },
    );
    return reply.status(204).send();
  });

  fastify.post("/:username/ban", { preHandler: fastify.requireServerAccess("players.ban") }, async (request, reply) => {
    const { username } = request.params as { username: string };
    const { reason } = banPlayerSchema.parse(request.body ?? {});
    await playerService.ban(request.mcServer!, username, reason);
    await fastify.audit.record(
      AuditAction.PLAYER_BAN,
      { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
      { username, reason },
    );
    return reply.status(204).send();
  });

  fastify.post("/:username/unban", { preHandler: fastify.requireServerAccess("players.ban") }, async (request, reply) => {
    const { username } = request.params as { username: string };
    await playerService.unban(request.mcServer!, username);
    await fastify.audit.record(
      AuditAction.PLAYER_UNBAN,
      { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
      { username },
    );
    return reply.status(204).send();
  });

  fastify.post(
    "/:username/message",
    { preHandler: fastify.requireServerAccess("players.message") },
    async (request, reply) => {
      const { username } = request.params as { username: string };
      const { message } = messagePlayerSchema.parse(request.body);
      await playerService.message(request.mcServer!, username, message);
      await fastify.audit.record(
        AuditAction.PLAYER_MESSAGE,
        { userId: request.user!.id, serverId: request.mcServer!.id, ipAddress: request.ip },
        { username },
      );
      return reply.status(204).send();
    },
  );
}

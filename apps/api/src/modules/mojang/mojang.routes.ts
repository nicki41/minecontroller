import type { FastifyInstance } from "fastify";
import { BadRequestError } from "../../lib/errors.js";
import { MojangService } from "./mojang.service.js";

const UUID_RE = /^[0-9a-fA-F-]{32,36}$/;

function assertValidUuid(uuid: string): void {
  if (!UUID_RE.test(uuid)) throw new BadRequestError("Invalid UUID.");
}

export async function mojangRoutes(fastify: FastifyInstance) {
  const mojangService = new MojangService();

  fastify.get("/:uuid/meta", { preHandler: fastify.requireAuth }, async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    assertValidUuid(uuid);
    const profile = await mojangService.getProfile(uuid);
    return reply.send({ slim: profile.slim, hasSkin: profile.skinUrl !== null, hasCape: profile.capeUrl !== null });
  });

  fastify.get("/:uuid/skin.png", { preHandler: fastify.requireAuth }, async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    assertValidUuid(uuid);
    const bytes = await mojangService.getSkinBytes(uuid);
    return reply.header("Cache-Control", "private, max-age=900").type("image/png").send(bytes);
  });

  fastify.get("/:uuid/cape.png", { preHandler: fastify.requireAuth }, async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    assertValidUuid(uuid);
    const bytes = await mojangService.getCapeBytes(uuid);
    return reply.header("Cache-Control", "private, max-age=900").type("image/png").send(bytes);
  });
}

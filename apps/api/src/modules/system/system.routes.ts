import type { FastifyInstance } from "fastify";
import { getPublicIp } from "../../lib/publicIp.js";
import { env } from "../../config/env.js";

export async function systemRoutes(fastify: FastifyInstance) {
  fastify.get("/network", { preHandler: fastify.requireAuth }, async (_request, reply) => {
    const publicIp = await getPublicIp();
    return reply.send({ publicIp });
  });

  fastify.get("/notifications/vapid-public-key", { preHandler: fastify.requireAuth }, async (_request, reply) => {
    return reply.send({ vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null });
  });
}

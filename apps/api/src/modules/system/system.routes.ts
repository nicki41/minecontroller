import type { FastifyInstance } from "fastify";
import { getPublicIp } from "../../lib/publicIp.js";

export async function systemRoutes(fastify: FastifyInstance) {
  fastify.get("/network", { preHandler: fastify.requireAuth }, async (_request, reply) => {
    const publicIp = await getPublicIp();
    return reply.send({ publicIp });
  });
}

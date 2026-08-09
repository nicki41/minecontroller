import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PlayerActivityTracker } from "../minecraft/PlayerActivityTracker.js";

export default fp(async (fastify: FastifyInstance) => {
  const tracker = new PlayerActivityTracker(fastify.prisma, fastify.serverManager);
  tracker.start();

  fastify.addHook("onClose", async () => {
    tracker.stop();
  });
});

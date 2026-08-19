import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PlayerActivityTracker } from "../minecraft/PlayerActivityTracker.js";

declare module "fastify" {
  interface FastifyInstance {
    playerActivityTracker: PlayerActivityTracker;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const tracker = new PlayerActivityTracker(fastify.prisma, fastify.serverManager);
  tracker.start();

  fastify.decorate("playerActivityTracker", tracker);
  fastify.addHook("onClose", async () => {
    tracker.stop();
  });
});

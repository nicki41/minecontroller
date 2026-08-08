import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { LiveSessionRegistry } from "../ws/LiveSessionRegistry.js";

declare module "fastify" {
  interface FastifyInstance {
    liveSessions: LiveSessionRegistry;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const registry = new LiveSessionRegistry(fastify.serverManager);
  fastify.decorate("liveSessions", registry);
  fastify.addHook("onClose", async () => {
    registry.disposeAll();
  });
});

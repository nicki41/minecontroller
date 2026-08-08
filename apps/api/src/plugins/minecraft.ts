import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MinecraftServerManager } from "../minecraft/MinecraftServerManager.js";

declare module "fastify" {
  interface FastifyInstance {
    serverManager: MinecraftServerManager;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const manager = new MinecraftServerManager(fastify.prisma);
  manager.on("status", (serverId, status) => {
    fastify.log.info({ serverId, status }, "Server status changed");
  });
  manager.startReconciler();

  fastify.decorate("serverManager", manager);
  fastify.addHook("onClose", async () => {
    manager.stopReconciler();
  });
});

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MetricsHistoryStore } from "../minecraft/MetricsHistoryStore.js";
import { MetricsHistoryCollector } from "../minecraft/MetricsHistoryCollector.js";

declare module "fastify" {
  interface FastifyInstance {
    metricsHistory: MetricsHistoryStore;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const store = new MetricsHistoryStore();
  const collector = new MetricsHistoryCollector(fastify.prisma, fastify.serverManager, store);
  collector.start();

  fastify.decorate("metricsHistory", store);
  fastify.addHook("onClose", async () => {
    collector.stop();
  });
});

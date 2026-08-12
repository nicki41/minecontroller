import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { SchedulerService } from "../modules/scheduler/scheduler.service.js";
import { BackupService } from "../modules/backups/backups.service.js";

declare module "fastify" {
  interface FastifyInstance {
    schedulerService: SchedulerService;
  }
}

/** Must be registered after minecraftPlugin/auditPlugin in app.ts — both are read off `fastify` here at registration time. */
export default fp(async (fastify: FastifyInstance) => {
  const service = new SchedulerService(
    fastify.prisma,
    fastify.serverManager,
    new BackupService(fastify.prisma),
    fastify.audit,
  );
  service.startTicking();

  fastify.decorate("schedulerService", service);
  fastify.addHook("onClose", async () => {
    service.stopTicking();
  });
});

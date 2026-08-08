import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { AuditService } from "../modules/audit/audit.service.js";

declare module "fastify" {
  interface FastifyInstance {
    audit: AuditService;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate("audit", new AuditService(fastify.prisma));
});

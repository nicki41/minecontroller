import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient({
    log: [
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
    ],
  });

  prisma.$on("warn" as never, (e: unknown) => fastify.log.warn({ prisma: e }, "prisma warning"));
  prisma.$on("error" as never, (e: unknown) => fastify.log.error({ prisma: e }, "prisma error"));

  await prisma.$connect();

  // SQLite defaults to a single-writer rollback journal, which can throw
  // SQLITE_BUSY under the app's normal concurrent writes (status reconciler,
  // audit log, WS-driven updates all hitting the DB around the same time).
  // WAL lets readers and a writer proceed concurrently; busy_timeout makes
  // any remaining brief lock contention retry instead of failing outright.
  // $queryRawUnsafe, not $executeRawUnsafe: SQLite's PRAGMA statements
  // always return the resulting value as a row, even in "setter" form —
  // $executeRawUnsafe rejects that with "Execute returned results".
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
});

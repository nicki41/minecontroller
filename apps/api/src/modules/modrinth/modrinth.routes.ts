import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ModrinthClient } from "./modrinth.client.js";

const client = new ModrinthClient();

const csvList = z
  .string()
  .optional()
  .transform((v) => v?.split(",").map((s) => s.trim()).filter(Boolean));

const searchQuerySchema = z.object({
  query: z.string().optional(),
  projectTypes: csvList,
  loaders: csvList,
  gameVersions: csvList,
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const versionsQuerySchema = z.object({
  loader: z.string().optional(),
  gameVersion: z.string().optional(),
});

/**
 * Read-only browsing of Modrinth's public catalog. Any authenticated user
 * can browse (it's third-party public data, not one of our servers) —
 * actually installing something is a separate, server-scoped permission
 * handled by plugins.routes.ts.
 */
export async function modrinthRoutes(fastify: FastifyInstance) {
  fastify.get("/search", { preHandler: fastify.requireAuth }, async (request, reply) => {
    const params = searchQuerySchema.parse(request.query);
    const result = await client.search(params);
    return reply.send(result);
  });

  fastify.get("/project/:idOrSlug", { preHandler: fastify.requireAuth }, async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    const project = await client.getProject(idOrSlug);
    return reply.send(project);
  });

  fastify.get("/project/:idOrSlug/versions", { preHandler: fastify.requireAuth }, async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    const params = versionsQuerySchema.parse(request.query);
    const versions = await client.getProjectVersions(idOrSlug, params);
    return reply.send({ versions });
  });

  fastify.get("/game-versions", { preHandler: fastify.requireAuth }, async (_request, reply) => {
    const versions = await client.getGameVersions();
    return reply.send({ versions });
  });
}

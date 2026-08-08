import { z } from "zod";

export const installModrinthVersionSchema = z.object({
  versionId: z.string().min(1),
  restart: z.boolean().default(false),
  /** Cosmetic only (see PluginInstall.author) — Modrinth's project API has no author field, so this is passed through from the client's already-fetched search result. */
  author: z.string().trim().max(200).optional(),
});
export type InstallModrinthVersionInput = z.infer<typeof installModrinthVersionSchema>;

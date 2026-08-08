import { z } from "zod";

export const createBackupSchema = z.object({
  note: z.string().trim().max(200).optional(),
});
export type CreateBackupInput = z.infer<typeof createBackupSchema>;

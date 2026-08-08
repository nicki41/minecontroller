import { z } from "zod";

export const createFileEntrySchema = z.object({
  path: z.string().min(1),
  type: z.enum(["file", "directory"]),
});
export type CreateFileEntryInput = z.infer<typeof createFileEntrySchema>;

export const moveFileSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});
export type MoveFileInput = z.infer<typeof moveFileSchema>;

export const copyFileSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});
export type CopyFileInput = z.infer<typeof copyFileSchema>;

export const writeFileContentSchema = z.object({
  content: z.string().max(10 * 1024 * 1024, "File is too large to save through the editor (10MB limit)."),
});
export type WriteFileContentInput = z.infer<typeof writeFileContentSchema>;

export const extractZipSchema = z.object({
  path: z.string().min(1),
  destination: z.string().min(1).optional(),
});
export type ExtractZipInput = z.infer<typeof extractZipSchema>;

import { z } from "zod";

export const banPlayerSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});
export type BanPlayerInput = z.infer<typeof banPlayerSchema>;

export const whitelistAddSchema = z.object({
  username: z.string().trim().min(1).max(16),
});
export type WhitelistAddInput = z.infer<typeof whitelistAddSchema>;

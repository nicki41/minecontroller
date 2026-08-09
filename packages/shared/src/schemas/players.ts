import { z } from "zod";

export const banPlayerSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});
export type BanPlayerInput = z.infer<typeof banPlayerSchema>;

export const whitelistAddSchema = z.object({
  username: z.string().trim().min(1).max(16),
});
export type WhitelistAddInput = z.infer<typeof whitelistAddSchema>;

export const messagePlayerSchema = z.object({
  message: z.string().trim().min(1).max(256),
});
export type MessagePlayerInput = z.infer<typeof messagePlayerSchema>;

/**
 * RCON isn't a shell, so classic shell-injection doesn't apply, but nothing
 * stops a malformed value from breaking the intended command or smuggling
 * an extra one — same spirit as the username/reason validation already
 * enforced server-side in players.service.ts.
 */
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;
export const ipAddressSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((v) => IPV4_RE.test(v) || IPV6_RE.test(v), "Invalid IP address.");

export const tempBanPlayerSchema = z.object({
  reason: z.string().trim().max(200).optional(),
  durationMinutes: z.number().int().min(1).max(60 * 24 * 365),
});
export type TempBanPlayerInput = z.infer<typeof tempBanPlayerSchema>;

export const ipBanPlayerSchema = z.object({
  ip: ipAddressSchema,
  reason: z.string().trim().max(200).optional(),
});
export type IpBanPlayerInput = z.infer<typeof ipBanPlayerSchema>;

export const ipUnbanPlayerSchema = z.object({
  ip: ipAddressSchema,
});
export type IpUnbanPlayerInput = z.infer<typeof ipUnbanPlayerSchema>;

export const gamemodeSchema = z.object({
  mode: z.enum(["SURVIVAL", "CREATIVE", "ADVENTURE", "SPECTATOR"]),
});
export type GamemodeInput = z.infer<typeof gamemodeSchema>;

import { z } from "zod";
import { PERMISSIONS } from "../permissions.js";
import { ACCESS_LEVEL } from "../types/enums.js";

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(48),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(48).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const setServerAccessSchema = z.object({
  level: z.enum(ACCESS_LEVEL).nullable(),
});
export type SetServerAccessInput = z.infer<typeof setServerAccessSchema>;

import { z } from "zod";
import { SCHEDULER_STEP_TYPES } from "../types/scheduler.js";

export const schedulerStepInputSchema = z.object({
  type: z.enum(SCHEDULER_STEP_TYPES),
  payload: z.string().trim().max(500).optional(),
  delayAfterSec: z.coerce.number().int().min(0).max(3600).default(0),
});
export type SchedulerStepInput = z.infer<typeof schedulerStepInputSchema>;

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  /** Standard 5-field cron expression; syntactic validity is checked with cron-parser on the API side, not here, so the error message can explain why. */
  cronExpr: z.string().trim().min(1, "Schedule is required"),
  enabled: z.boolean().default(true),
  steps: z.array(schedulerStepInputSchema).min(1, "Add at least one step").max(20, "Too many steps"),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = createWorkflowSchema.partial();
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

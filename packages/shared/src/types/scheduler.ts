export const SCHEDULER_STEP_TYPES = ["COMMAND", "START", "STOP", "RESTART", "BACKUP"] as const;
export type SchedulerStepType = (typeof SCHEDULER_STEP_TYPES)[number];

export const SCHEDULER_RUN_STATUSES = ["RUNNING", "SUCCESS", "FAILED"] as const;
export type SchedulerRunStatus = (typeof SCHEDULER_RUN_STATUSES)[number];

export interface SchedulerStepDto {
  id: string;
  order: number;
  type: SchedulerStepType;
  payload: string | null;
  delayAfterSec: number;
}

export interface SchedulerWorkflowDto {
  id: string;
  serverId: string;
  name: string;
  cronExpr: string;
  enabled: boolean;
  createdByUsername: string | null;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  steps: SchedulerStepDto[];
}

export interface SchedulerRunStepLogEntry {
  stepId: string;
  type: SchedulerStepType;
  ok: boolean;
  message: string | null;
  at: string;
}

export interface SchedulerRunDto {
  id: string;
  workflowId: string;
  startedAt: string;
  finishedAt: string | null;
  status: SchedulerRunStatus;
  log: SchedulerRunStepLogEntry[];
}

/** Next-fire-time preview for a cron expression, computed server-side (cron-parser) so date arithmetic has one source of truth; human-readable text is derived client-side (cronstrue) from the same expression. */
export interface CronPreviewDto {
  valid: boolean;
  error: string | null;
  nextRuns: string[];
}

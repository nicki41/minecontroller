import type { z } from "zod";

// Deliberately its own side-effect-free module: server.ts needs to catch
// this specific error class from a dynamic import of env.ts (which runs
// validation — and may throw it — as soon as it's evaluated), so the class
// itself must be importable without triggering that evaluation.
export class EnvValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super("Invalid environment configuration");
    this.name = "EnvValidationError";
  }
}

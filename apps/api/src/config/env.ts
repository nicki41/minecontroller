import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { EnvValidationError } from "./env-errors.js";

// Local dev convenience only: loads the repo-root .env (the same file
// docker-compose reads) so `npm run dev` works without exporting vars into
// the shell manually. In Docker, compose injects real environment
// variables directly and no .env file is present in the image, so this is
// a safe no-op there. This file lives at apps/api/src/config (dev) or
// apps/api/dist/config (prod build) — both four levels under the repo root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    WEB_ORIGIN: z.string().default("http://localhost:3000"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters (openssl rand -hex 32)"),
    COOKIE_SECURE: z
      .string()
      .default("true")
      .transform((v) => v !== "false"),

    DOCKER_SOCKET_PATH: z.string().default("/var/run/docker.sock"),
    HOST_DATA_PATH: z
      .string()
      .min(1, "HOST_DATA_PATH is required — see .env.example")
      .refine((p) => p !== "." && !p.startsWith("./") && !p.startsWith("../"), {
        message:
          "HOST_DATA_PATH must be an absolute path as seen by the Docker host, not a relative one — see README 'Docker socket & host paths'",
      }),
    DATA_PATH: z.string().default("/data"),
    MINECRAFT_IMAGE: z.string().default("itzg/minecraft-server:latest"),
    MINECRAFT_NETWORK: z.string().default("minecraftpanel_mc_net"),

    MC_PORT_RANGE_MIN: z.coerce.number().int().min(1).max(65535).default(25565),
    MC_PORT_RANGE_MAX: z.coerce.number().int().min(1).max(65535).default(25664),

    MODRINTH_API_URL: z.string().url().default("https://api.modrinth.com/v2"),
    MODRINTH_USER_AGENT: z.string().default("minecraftpanel/0.1.0"),
  })
  .refine((e) => e.MC_PORT_RANGE_MIN <= e.MC_PORT_RANGE_MAX, {
    message: "MC_PORT_RANGE_MIN must be <= MC_PORT_RANGE_MAX",
    path: ["MC_PORT_RANGE_MIN"],
  });

export type Env = z.infer<typeof envSchema>;
export { EnvValidationError } from "./env-errors.js";

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) throw new EnvValidationError(result.error.issues);
  return result.data;
}

// Deliberately NOT a process.exit() here: this module is imported by plain
// unit tests too (e.g. session.test.ts), and an import-time process.exit
// would kill the whole test run instead of just failing one file. The one
// real entry point (server.ts) is what turns a failure into a clean exit.
export const env = loadEnv();

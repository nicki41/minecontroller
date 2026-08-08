import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", "*.password", "*.passwordHash", "*.token"],
    censor: "[redacted]",
  },
});

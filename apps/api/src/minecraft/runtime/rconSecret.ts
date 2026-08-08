import crypto from "node:crypto";
import { env } from "../../config/env.js";

/**
 * The per-server RCON password is derived deterministically from
 * SESSION_SECRET + the server's id, instead of being generated once and
 * stored. That means there's no separate secret at rest to leak or rotate
 * out of sync with the running container — anyone who can compute this
 * already has SESSION_SECRET and therefore already controls every session
 * in the system, so it adds no separate exposure.
 */
export function deriveRconPassword(serverId: string): string {
  return crypto.createHmac("sha256", env.SESSION_SECRET).update(`rcon:${serverId}`).digest("hex").slice(0, 32);
}

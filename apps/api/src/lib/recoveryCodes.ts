import crypto from "node:crypto";
import { env } from "../config/env.js";

const RECOVERY_CODE_COUNT = 10;
// No 0/O/1/I/L — unambiguous when handwritten or read off a screenshot.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/** Plaintext codes — only ever returned to the client once, at generation time. */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, randomCode);
}

/** Keyed hash (not a slow password hash — codes are single-use and already high-entropy). */
export function hashRecoveryCode(code: string): string {
  return crypto.createHmac("sha256", env.SESSION_SECRET).update(code.trim().toUpperCase()).digest("hex");
}

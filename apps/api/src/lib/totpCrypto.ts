import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * TOTP secrets are encrypted at rest (AES-256-GCM, key derived from
 * SESSION_SECRET) rather than stored as plain base32 — unlike session
 * tokens or RCON passwords, a leaked TOTP secret alone is enough to defeat
 * 2FA indefinitely for that account, so it's worth the extra layer even
 * though SESSION_SECRET compromise is already catastrophic on its own.
 */
const KEY = crypto.createHash("sha256").update(`totp-secret-key:${env.SESSION_SECRET}`).digest();
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encryptTotpSecret(plainBase32: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBase32, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptTotpSecret(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

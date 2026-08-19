import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * NotificationChannel.configEncrypted (webhook URLs, Telegram bot tokens)
 * encrypted at rest — same AES-256-GCM-from-SESSION_SECRET pattern as
 * totpCrypto.ts, with a different derivation label so this key is
 * independent of the TOTP one despite sharing the same root secret.
 */
const KEY = crypto.createHash("sha256").update(`webhook-secret-key:${env.SESSION_SECRET}`).digest();
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encryptChannelConfig(config: unknown): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptChannelConfig<T = unknown>(encoded: string): T {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(json) as T;
}

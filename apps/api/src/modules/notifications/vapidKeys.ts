import webpush from "web-push";
import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";

const SETTING_KEY = "vapid_keys";

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** mailto: is the VAPID spec's simplest valid subject form — derived from WEB_ORIGIN so it's not just a meaningless placeholder, without requiring a dedicated env var. */
function defaultSubject(): string {
  try {
    return `mailto:admin@${new URL(env.WEB_ORIGIN).hostname}`;
  } catch {
    return "mailto:admin@example.com";
  }
}

/**
 * Resolves the VAPID keypair used for web push, in priority order:
 *
 * 1. Explicit VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY env vars, if both set —
 *    lets an operator pin/rotate a key deliberately (e.g. migrating data
 *    to a fresh instance without invalidating already-subscribed devices).
 * 2. A pair auto-generated on a previous boot, persisted in the Setting
 *    table (same instance-wide key/value store Modrinth UA overrides use).
 * 3. Freshly generated (web-push's own generateVAPIDKeys(), a standard
 *    ECDH P-256 keypair) and persisted for next boot — generating a new
 *    pair on every restart would silently invalidate every existing push
 *    subscription each time, since the browser's subscription is bound to
 *    the exact public key it was created with.
 *
 * Either way this always returns a usable keypair — web push is on by
 * default, no manual setup required.
 */
export async function resolveVapidKeys(prisma: PrismaClient): Promise<VapidKeys> {
  const subject = env.VAPID_SUBJECT || defaultSubject();

  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject };
  }

  const existing = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (existing) {
    const parsed = JSON.parse(existing.value) as { publicKey: string; privateKey: string };
    return { ...parsed, subject };
  }

  const generated = webpush.generateVAPIDKeys();
  await prisma.setting.create({ data: { key: SETTING_KEY, value: JSON.stringify(generated) } });
  return { ...generated, subject };
}

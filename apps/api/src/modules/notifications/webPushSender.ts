import webpush from "web-push";
import { logger } from "../../lib/logger.js";
import type { VapidKeys } from "./vapidKeys.js";

// Configured once at boot from plugins/notifications.ts (via
// resolveVapidKeys), not eagerly at module load — the keys may need to be
// read from (or generated and written to) the database first. `configured`
// only ever false if that call itself fails, e.g. a DB error.
let configured = false;
let currentPublicKey: string | null = null;

export function configureWebPush(keys: VapidKeys): void {
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  configured = true;
  currentPublicKey = keys.publicKey;
  logger.info({ publicKey: keys.publicKey }, "Web push configured.");
}

export function isWebPushConfigured(): boolean {
  return configured;
}

export function getVapidPublicKey(): string | null {
  return currentPublicKey;
}

export interface WebPushPayload {
  title: string;
  body: string;
  /** Relative URL to open when the notification is clicked, e.g. "/servers/<id>". */
  url?: string;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Returns false (and, for a 404/410, the caller should delete the subscription) if the push service reports the subscription is gone. */
export async function sendWebPush(subscription: PushSubscriptionKeys, payload: WebPushPayload): Promise<{ ok: boolean; expired: boolean }> {
  if (!configured) return { ok: false, expired: false };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true, expired: false };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const expired = statusCode === 404 || statusCode === 410;
    if (!expired) logger.debug({ err, endpoint: subscription.endpoint }, "Web push send failed");
    return { ok: false, expired };
  }
}

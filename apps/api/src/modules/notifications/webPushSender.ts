import webpush from "web-push";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const vapidConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

if (vapidConfigured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
} else {
  logger.warn(
    "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT not fully set — web push notifications are disabled. See docs/configuration.md#web-push-notifications.",
  );
}

export function isWebPushConfigured(): boolean {
  return vapidConfigured;
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
  if (!vapidConfigured) return { ok: false, expired: false };

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

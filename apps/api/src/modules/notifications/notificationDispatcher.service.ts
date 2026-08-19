import type { PrismaClient } from "@prisma/client";
import type { NotificationCategory } from "@minecraftpanel/shared";
import { logger } from "../../lib/logger.js";
import { sendWebPush } from "./webPushSender.js";

export interface NotificationEvent {
  serverId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Relative URL opened on notification click — defaults to the server's page. */
  url?: string;
}

/**
 * Central fan-out point for every notification-worthy event in the panel.
 * Event *sources* (MinecraftServerManager's "status", PlayerActivityTracker's
 * "playerJoin"/"playerLeave", the backups route, the performance/update
 * checkers — see plugins/notifications.ts) call dispatch(); this looks up
 * who's subscribed to that category on that server and sends to each.
 *
 * Push (per-user, per-device) is wired here. External service channels
 * (Discord/Telegram/Slack/webhook, per-server) are added to this same
 * dispatch() in a later change — see NotificationChannel.
 */
export class NotificationDispatcherService {
  constructor(private readonly prisma: PrismaClient) {}

  async dispatch(event: NotificationEvent): Promise<void> {
    await Promise.all([this.dispatchPush(event)]);
  }

  private async dispatchPush(event: NotificationEvent): Promise<void> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { serverId: event.serverId, [event.category]: true },
      include: { user: { include: { pushSubscriptions: true } } },
    });

    const expiredSubscriptionIds: string[] = [];

    await Promise.all(
      preferences.flatMap((pref) =>
        pref.user.pushSubscriptions.map(async (sub) => {
          const result = await sendWebPush(sub, {
            title: event.title,
            body: event.body,
            url: event.url ?? `/servers/${event.serverId}`,
          });
          if (result.expired) expiredSubscriptionIds.push(sub.id);
        }),
      ),
    );

    if (expiredSubscriptionIds.length > 0) {
      await this.prisma.pushSubscription.deleteMany({ where: { id: { in: expiredSubscriptionIds } } }).catch((err) => {
        logger.debug({ err }, "Failed to clean up expired push subscriptions");
      });
    }
  }
}

import type { NotificationCategory } from "../notifications.js";

export interface NotificationPreferenceDto extends Record<NotificationCategory, boolean> {
  serverId: string;
}

export interface PushSubscriptionSummaryDto {
  id: string;
  userAgent: string | null;
  createdAt: string;
}

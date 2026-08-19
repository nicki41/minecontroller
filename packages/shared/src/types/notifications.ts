import type { NotificationCategory, NotificationChannelType } from "../notifications.js";

export interface NotificationPreferenceDto extends Record<NotificationCategory, boolean> {
  serverId: string;
}

export interface PushSubscriptionSummaryDto {
  id: string;
  userAgent: string | null;
  createdAt: string;
}

/** Redacted — never includes the decrypted webhook URL/token, just whether one is set. */
export interface NotificationChannelDto extends Record<NotificationCategory, boolean> {
  id: string;
  serverId: string;
  type: NotificationChannelType;
  label: string;
  configured: boolean;
  createdAt: string;
  updatedAt: string;
}

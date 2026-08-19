/**
 * Fixed notification category set, shared by both delivery mechanisms:
 * per-user web push (NotificationPreference) and per-server external
 * service channels (NotificationChannel, Discord/Telegram/Slack/webhook).
 * Both store one boolean column per category below — kept as a fixed list
 * rather than a normalized table since the category set itself doesn't
 * vary per row (see the schema doc comments).
 */
export const NOTIFICATION_CATEGORIES = [
  "serverStatus",
  "playerActivity",
  "crash",
  "backup",
  "performance",
  "updateAvailable",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  serverStatus: "Server offline / online",
  playerActivity: "Player join / leave",
  crash: "Crash / error reports",
  backup: "Backup completed / failed",
  performance: "Performance warning (high memory usage)",
  updateAvailable: "New server version available",
};

export const NOTIFICATION_CHANNEL_TYPES = ["DISCORD", "TELEGRAM", "SLACK", "WEBHOOK"] as const;
export type NotificationChannelType = (typeof NOTIFICATION_CHANNEL_TYPES)[number];

export const NOTIFICATION_CHANNEL_TYPE_LABELS: Record<NotificationChannelType, string> = {
  DISCORD: "Discord",
  TELEGRAM: "Telegram",
  SLACK: "Slack",
  WEBHOOK: "Generic webhook",
};

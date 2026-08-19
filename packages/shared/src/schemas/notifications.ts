import { z } from "zod";
import { NOTIFICATION_CATEGORIES } from "../notifications.js";

/** Matches the shape of the browser's PushSubscription.toJSON(). */
export const subscribePushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
});
export type SubscribePushInput = z.infer<typeof subscribePushSchema>;

const categoryToggles = Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, z.boolean()])) as Record<
  (typeof NOTIFICATION_CATEGORIES)[number],
  z.ZodBoolean
>;

export const updateNotificationPreferenceSchema = z.object(categoryToggles);
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;

const optionalCategoryToggles = Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, z.boolean().optional()])) as Record<
  (typeof NOTIFICATION_CATEGORIES)[number],
  z.ZodOptional<z.ZodBoolean>
>;

const label = z.string().trim().min(1).max(100);

/** One variant per NotificationChannelType — each carries exactly the config fields that provider's API needs. */
export const createNotificationChannelSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("DISCORD"), label, webhookUrl: z.string().url(), ...optionalCategoryToggles }),
  z.object({ type: z.literal("SLACK"), label, webhookUrl: z.string().url(), ...optionalCategoryToggles }),
  z.object({
    type: z.literal("TELEGRAM"),
    label,
    botToken: z.string().min(1),
    chatId: z.string().min(1),
    ...optionalCategoryToggles,
  }),
  z.object({ type: z.literal("WEBHOOK"), label, url: z.string().url(), ...optionalCategoryToggles }),
]);
export type CreateNotificationChannelInput = z.infer<typeof createNotificationChannelSchema>;

/**
 * label + category toggles only — rotating the webhook URL/token itself
 * means deleting and recreating the channel, which keeps this schema (and
 * the API route) from needing a second discriminated union keyed off a
 * type that isn't even in the request body.
 */
export const updateNotificationChannelSchema = z.object({ label: label.optional(), ...optionalCategoryToggles });
export type UpdateNotificationChannelInput = z.infer<typeof updateNotificationChannelSchema>;

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

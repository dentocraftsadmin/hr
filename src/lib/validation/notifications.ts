import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const notificationPreferencesSchema = z.object({
  push_enabled: z.boolean(),
  remind_punch_in: z.boolean(),
  remind_punch_in_minutes_before: z.coerce.number().int().min(0).max(120),
  remind_punch_out: z.boolean(),
  remind_missed_punch: z.boolean(),
  remind_missed_punch_out: z.boolean(),
});

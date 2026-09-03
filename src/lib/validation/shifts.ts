import { z } from "zod";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

export const shiftSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  start_time: timeSchema,
  end_time: timeSchema,
  working_days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one working day"),
  late_buffer_minutes: z.coerce.number().int().min(0).max(120),
});

export const shiftIdSchema = z.object({ id: z.uuid() });

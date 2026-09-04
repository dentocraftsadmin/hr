import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const createLeaveRequestSchema = z
  .object({
    leave_type_id: z.uuid("Select a leave type"),
    from_date: isoDate,
    to_date: isoDate,
    is_half_day: z.boolean().default(false),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.to_date >= data.from_date, {
    message: "End date can't be before the start date",
    path: ["to_date"],
  });

export const leaveRequestIdSchema = z.object({ id: z.uuid() });

export const reviewLeaveRequestSchema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "rejected"]),
  admin_note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const holidaySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  date: isoDate,
  applies_to_office_id: z.uuid().optional().or(z.literal("")),
});

export const holidayIdSchema = z.object({ id: z.uuid() });

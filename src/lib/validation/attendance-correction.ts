import { z } from "zod";

export const correctAttendanceDaySchema = z.object({
  attendanceDayId: z.uuid(),
  day_type: z.enum(["full_day", "half_day", "absent", "on_leave", "holiday", "week_off"]),
  hours_worked: z.coerce.number().min(0).max(24).optional(),
  reason: z.string().trim().min(1, "A reason is required for every correction").max(500),
});

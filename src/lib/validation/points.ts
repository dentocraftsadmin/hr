import { z } from "zod";

export const adjustScoreSchema = z.object({
  employeeId: z.uuid(),
  points: z.coerce.number().refine((n) => n !== 0, "Adjustment can't be zero"),
  reason: z.string().trim().min(1, "A reason is required for every manual adjustment").max(500),
});

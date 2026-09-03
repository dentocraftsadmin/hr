import { z } from "zod";

export const officeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius_meters: z.coerce.number().int().min(20).max(5000),
  default_shift_id: z.uuid().optional().or(z.literal("")),
});

export const officeIdSchema = z.object({ id: z.uuid() });

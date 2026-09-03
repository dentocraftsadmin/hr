import { z } from "zod";

/** Shared shape for the simple name+active lookup tables: departments, designations. */
export const lookupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const lookupIdSchema = z.object({
  id: z.uuid(),
});

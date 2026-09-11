import { z } from "zod";
import { phoneSchema, pinSchema } from "./auth";

/** Employee self-registration. Deliberately has no role field anywhere in
 * this schema — the server action that consumes it hardcodes
 * profiles.role = "employee" and never reads a role from client input, so
 * there is nothing here a client could set to become anything else. */
export const registerEmployeeSchema = z
  .object({
    full_name: z.string().trim().min(1, "Name is required").max(150),
    phone: phoneSchema,
    enrollment_code: z.string().trim().min(1, "Enter the company registration code"),
    birth_year: z.coerce.number().int().min(1940).max(new Date().getFullYear()),
    joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a joining date"),
    office_id: z.uuid("Select the office you'll be working from"),
    pin: pinSchema,
    confirm_pin: pinSchema,
  })
  .refine((data) => data.pin === data.confirm_pin, {
    message: "PIN and confirmation do not match",
    path: ["confirm_pin"],
  });

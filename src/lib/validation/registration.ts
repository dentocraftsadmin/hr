import { z } from "zod";
import { phoneSchema, pinSchema } from "./auth";
import { pushSubscriptionSchema } from "./notifications";

/** Employee self-registration. Deliberately has no role field anywhere in
 * this schema — the server action that consumes it hardcodes
 * profiles.role = "employee" and never reads a role from client input, so
 * there is nothing here a client could set to become anything else.
 *
 * push_subscription is required, not optional: registration is only
 * mandatory-push-gated in the UI as a courtesy to the employee (clear
 * explanation, no impossible loop) — the actual enforcement is here, since
 * this schema is the one thing every registration request must pass
 * regardless of what the client did or didn't show. */
export const registerEmployeeSchema = z
  .object({
    full_name: z.string().trim().min(1, "Name is required").max(150),
    phone: phoneSchema,
    enrollment_code: z.string().trim().min(1, "Enter the company registration code"),
    birth_year: z.coerce.number().int().min(1940).max(new Date().getFullYear()),
    birth_month: z.coerce.number().int().min(1, "Pick a birth month").max(12),
    birth_day: z.coerce.number().int().min(1, "Pick a birth day").max(31),
    joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a joining date"),
    office_id: z.uuid("Select the office you'll be working from"),
    pin: pinSchema,
    confirm_pin: pinSchema,
    push_subscription: pushSubscriptionSchema,
  })
  .refine((data) => data.pin === data.confirm_pin, {
    message: "PIN and confirmation do not match",
    path: ["confirm_pin"],
  })
  .refine(
    (data) => {
      const daysInMonth = new Date(2024, data.birth_month, 0).getDate(); // 2024: leap year, so Feb 29 always validates as a shape
      return data.birth_day <= daysInMonth;
    },
    { message: "That day doesn't exist in the selected month", path: ["birth_day"] }
  );

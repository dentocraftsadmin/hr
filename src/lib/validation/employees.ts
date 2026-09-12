import { z } from "zod";
import { phoneSchema, pinSchema } from "./auth";

export const createEmployeeSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(150),
  phone: phoneSchema,
  pin: pinSchema,
  birth_year: z.coerce.number().int().min(1940).max(new Date().getFullYear()),
  birth_month: z.coerce.number().int().min(1, "Pick a birth month").max(12),
  birth_day: z.coerce.number().int().min(1, "Pick a birth day").max(31),
  department_id: z.uuid().optional().or(z.literal("")),
  designation_id: z.uuid().optional().or(z.literal("")),
  shift_id: z.uuid().optional().or(z.literal("")),
  office_id: z.uuid("Select the employee's office"),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a joining date"),
});

export const updateEmployeeSchema = z.object({
  id: z.uuid(),
  full_name: z.string().trim().min(1, "Name is required").max(150),
  birth_year: z.coerce.number().int().min(1940).max(new Date().getFullYear()),
  department_id: z.uuid().optional().or(z.literal("")),
  designation_id: z.uuid().optional().or(z.literal("")),
  shift_id: z.uuid().optional().or(z.literal("")),
  employment_status: z.enum(["active", "inactive", "terminated"]),
});

export const employeeIdSchema = z.object({ id: z.uuid() });

export const updateEmployeeStatusSchema = z.object({
  id: z.uuid(),
  employment_status: z.enum(["active", "inactive", "terminated"]),
});

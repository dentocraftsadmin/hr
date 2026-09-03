import { z } from "zod";

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN must be exactly 4 digits");

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const loginSchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
});

export const changePinSchema = z
  .object({
    currentPin: pinSchema,
    newPin: pinSchema,
    confirmPin: pinSchema,
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "New PIN and confirmation do not match",
    path: ["confirmPin"],
  });

export const resetPinSchema = z.object({
  employeeId: z.uuid(),
  newPin: pinSchema,
});

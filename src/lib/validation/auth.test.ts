import { describe, it, expect } from "vitest";
import { loginSchema, changePinSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid phone + 4-digit PIN", () => {
    expect(loginSchema.safeParse({ phone: "9876543210", pin: "1234" }).success).toBe(true);
  });

  it("rejects a PIN that isn't exactly 4 digits", () => {
    expect(loginSchema.safeParse({ phone: "9876543210", pin: "123" }).success).toBe(false);
    expect(loginSchema.safeParse({ phone: "9876543210", pin: "12345" }).success).toBe(false);
    expect(loginSchema.safeParse({ phone: "9876543210", pin: "12a4" }).success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    expect(loginSchema.safeParse({ phone: "12345", pin: "1234" }).success).toBe(false);
  });
});

describe("changePinSchema", () => {
  it("requires the new PIN and confirmation to match", () => {
    const result = changePinSchema.safeParse({
      currentPin: "1111",
      newPin: "2222",
      confirmPin: "3333",
    });
    expect(result.success).toBe(false);
  });

  it("accepts matching new PIN and confirmation", () => {
    const result = changePinSchema.safeParse({
      currentPin: "1111",
      newPin: "2222",
      confirmPin: "2222",
    });
    expect(result.success).toBe(true);
  });
});

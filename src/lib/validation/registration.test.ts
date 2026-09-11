import { describe, it, expect } from "vitest";
import { registerEmployeeSchema } from "./registration";

const validInput = {
  full_name: "Jane Doe",
  phone: "9876543210",
  enrollment_code: "ABCD1234",
  birth_year: 1995,
  joining_date: "2026-01-15",
  office_id: "8f14e45f-ceea-467e-9575-9e0f6a5f2b9b",
  pin: "1234",
  confirm_pin: "1234",
};

describe("registerEmployeeSchema", () => {
  it("accepts valid input", () => {
    expect(registerEmployeeSchema.safeParse(validInput).success).toBe(true);
  });

  it("has no role field at all — a client cannot submit one", () => {
    // The schema itself is the security boundary here: zod strips any key
    // it doesn't recognize, so even if a request body smuggled in a role,
    // it can never reach the parsed result the server action acts on.
    const withSmuggledRole = { ...validInput, role: "admin" };
    const result = registerEmployeeSchema.safeParse(withSmuggledRole);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("role");
      expect(Object.keys(result.data).sort()).toEqual(
        Object.keys(validInput).sort()
      );
    }
  });

  it("rejects a PIN and confirmation that don't match", () => {
    const result = registerEmployeeSchema.safeParse({
      ...validInput,
      confirm_pin: "9999",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirm_pin"]);
    }
  });

  it("rejects a missing enrollment code", () => {
    const result = registerEmployeeSchema.safeParse({ ...validInput, enrollment_code: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid office id", () => {
    const result = registerEmployeeSchema.safeParse({ ...validInput, office_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a PIN that isn't exactly 4 digits", () => {
    expect(registerEmployeeSchema.safeParse({ ...validInput, pin: "123", confirm_pin: "123" }).success).toBe(false);
    expect(registerEmployeeSchema.safeParse({ ...validInput, pin: "12345", confirm_pin: "12345" }).success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    expect(registerEmployeeSchema.safeParse({ ...validInput, phone: "12345" }).success).toBe(false);
  });
});

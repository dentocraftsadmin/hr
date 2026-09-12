import { describe, it, expect } from "vitest";
import { registerEmployeeSchema } from "./registration";

const validPushSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "p256dh-key-value", auth: "auth-key-value" },
};

const validInput = {
  full_name: "Jane Doe",
  phone: "9876543210",
  enrollment_code: "ABCD1234",
  birth_year: 1995,
  birth_month: 6,
  birth_day: 15,
  joining_date: "2026-01-15",
  office_id: "8f14e45f-ceea-467e-9575-9e0f6a5f2b9b",
  pin: "1234",
  confirm_pin: "1234",
  push_subscription: validPushSubscription,
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

  it("requires a push subscription — mandatory notification setup is enforced here, not only in the UI", () => {
    const { push_subscription: _omit, ...withoutPush } = validInput;
    void _omit;
    expect(registerEmployeeSchema.safeParse(withoutPush).success).toBe(false);
  });

  it("rejects a malformed push subscription (a client-side bypass attempt can't fake the shape)", () => {
    expect(
      registerEmployeeSchema.safeParse({ ...validInput, push_subscription: { endpoint: "not-a-url" } }).success
    ).toBe(false);
    expect(
      registerEmployeeSchema.safeParse({ ...validInput, push_subscription: { endpoint: "https://example.com", keys: {} } })
        .success
    ).toBe(false);
  });

  it("rejects a birth day that doesn't exist in the given month", () => {
    const result = registerEmployeeSchema.safeParse({ ...validInput, birth_month: 2, birth_day: 30 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["birth_day"]);
    }
  });

  it("accepts Feb 29 (the schema treats it as always shape-valid; leap-year specifics are a display concern)", () => {
    expect(registerEmployeeSchema.safeParse({ ...validInput, birth_month: 2, birth_day: 29 }).success).toBe(true);
  });

  it("rejects an out-of-range birth month", () => {
    expect(registerEmployeeSchema.safeParse({ ...validInput, birth_month: 13 }).success).toBe(false);
    expect(registerEmployeeSchema.safeParse({ ...validInput, birth_month: 0 }).success).toBe(false);
  });
});

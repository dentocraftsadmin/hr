import { describe, it, expect } from "vitest";
import { isValidPhone, toE164, fromE164 } from "./phone";

describe("phone helpers", () => {
  it("accepts a valid 10-digit Indian mobile number", () => {
    expect(isValidPhone("9876543210")).toBe(true);
  });

  it("rejects numbers that don't start with 6-9", () => {
    expect(isValidPhone("1234567890")).toBe(false);
  });

  it("rejects numbers of the wrong length", () => {
    expect(isValidPhone("98765")).toBe(false);
    expect(isValidPhone("987654321099")).toBe(false);
  });

  it("converts to and from Supabase's phone format consistently", () => {
    // No leading "+" — Supabase Auth stores/looks up phone as bare digits.
    const stored = toE164("9876543210");
    expect(stored).toBe("919876543210");
    expect(fromE164(stored)).toBe("9876543210");
  });
});

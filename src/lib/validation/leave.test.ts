import { describe, it, expect } from "vitest";
import { createLeaveRequestSchema } from "./leave";

const base = {
  leave_type_id: crypto.randomUUID(),
  from_date: "2026-10-10",
  to_date: "2026-10-12",
  is_half_day: false,
  reason: "Family function",
};

describe("createLeaveRequestSchema", () => {
  it("accepts a well-formed multi-day request", () => {
    expect(createLeaveRequestSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = createLeaveRequestSchema.safeParse({ ...base, to_date: "2026-10-09" });
    expect(result.success).toBe(false);
  });

  it("accepts a same-day half-day request", () => {
    const result = createLeaveRequestSchema.safeParse({
      ...base,
      from_date: "2026-10-10",
      to_date: "2026-10-10",
      is_half_day: true,
    });
    expect(result.success).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { zonedTimeToUtc, utcToLocalDateTimeInput } from "./timezone";

describe("zonedTimeToUtc", () => {
  it("converts Asia/Kolkata (UTC+5:30, no DST) wall-clock time to UTC", () => {
    const utc = zonedTimeToUtc("2026-09-15T09:30", "Asia/Kolkata");
    expect(utc.toISOString()).toBe("2026-09-15T04:00:00.000Z");
  });

  it("uses the server/Vercel timezone correctly when it happens to be UTC itself", () => {
    const utc = zonedTimeToUtc("2026-09-15T09:30", "UTC");
    expect(utc.toISOString()).toBe("2026-09-15T09:30:00.000Z");
  });

  it("handles a DST-observing zone correctly for a summer date", () => {
    // America/New_York is UTC-4 in September (EDT).
    const utc = zonedTimeToUtc("2026-09-15T09:30", "America/New_York");
    expect(utc.toISOString()).toBe("2026-09-15T13:30:00.000Z");
  });

  it("handles a DST-observing zone correctly for a winter date (different offset)", () => {
    // America/New_York is UTC-5 in January (EST).
    const utc = zonedTimeToUtc("2026-01-15T09:30", "America/New_York");
    expect(utc.toISOString()).toBe("2026-01-15T14:30:00.000Z");
  });

  it("round-trips through utcToLocalDateTimeInput", () => {
    const original = "2026-09-15T09:30";
    const utc = zonedTimeToUtc(original, "Asia/Kolkata");
    expect(utcToLocalDateTimeInput(utc, "Asia/Kolkata")).toBe(original);
  });
});

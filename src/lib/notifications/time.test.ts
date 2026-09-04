import { describe, it, expect } from "vitest";
import { minutesSinceMidnight, timeToMinutes } from "./time";

describe("timeToMinutes", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesSinceMidnight", () => {
  it("respects the given timezone rather than the host's local time", () => {
    // 2026-01-01T09:00:00Z is 14:30 in Asia/Kolkata (UTC+5:30)
    const date = new Date("2026-01-01T09:00:00Z");
    expect(minutesSinceMidnight(date, "Asia/Kolkata")).toBe(14 * 60 + 30);
  });

  it("returns 0 at midnight UTC", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    expect(minutesSinceMidnight(date, "UTC")).toBe(0);
  });
});

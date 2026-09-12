import { describe, it, expect } from "vitest";
import { daysUntilNextOccurrence, describeBirthday } from "./birthdays";

const JAN_15_2026 = Date.UTC(2026, 0, 15);

describe("daysUntilNextOccurrence", () => {
  it("returns 0 when the birthday is today", () => {
    expect(daysUntilNextOccurrence(1, 15, JAN_15_2026)).toBe(0);
  });

  it("counts forward within the same year", () => {
    expect(daysUntilNextOccurrence(1, 20, JAN_15_2026)).toBe(5);
  });

  it("wraps to next year once the date has passed this year", () => {
    // Jan 10 already passed on Jan 15 2026 -- next occurrence is Jan 10 2027.
    expect(daysUntilNextOccurrence(1, 10, JAN_15_2026)).toBe(360);
  });

  it("wraps across a year boundary near December", () => {
    const dec20 = Date.UTC(2026, 11, 20);
    // Jan 5 2027 is 16 days after Dec 20 2026.
    expect(daysUntilNextOccurrence(1, 5, dec20)).toBe(16);
  });

  it("treats Feb 29 as Feb 28 in a non-leap year", () => {
    // 2026 is not a leap year. Feb 28 2026 is the occurrence.
    const feb1 = Date.UTC(2026, 1, 1);
    expect(daysUntilNextOccurrence(2, 29, feb1)).toBe(27);
  });

  it("uses the real Feb 29 in a leap year", () => {
    const feb1_2028 = Date.UTC(2028, 1, 1); // 2028 is a leap year
    expect(daysUntilNextOccurrence(2, 29, feb1_2028)).toBe(28);
  });
});

describe("describeBirthday", () => {
  it("labels today distinctly", () => {
    expect(describeBirthday({ month: 3, day: 4, daysUntil: 0 })).toBe("Mar 4 · today");
  });

  it("labels tomorrow distinctly", () => {
    expect(describeBirthday({ month: 3, day: 4, daysUntil: 1 })).toBe("Mar 4 · tomorrow");
  });

  it("otherwise counts days", () => {
    expect(describeBirthday({ month: 12, day: 25, daysUntil: 10 })).toBe("Dec 25 · in 10 days");
  });
});

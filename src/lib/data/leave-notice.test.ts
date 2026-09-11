import { describe, it, expect } from "vitest";
import { countQualifyingNoticeDays, assessNotice, describeNotice } from "./leave-notice";

// Mon-Fri working week (1=Mon..5=Fri), matching the app's 0=Sun..6=Sat convention.
const MON_FRI = [1, 2, 3, 4, 5];

describe("countQualifyingNoticeDays", () => {
  it("matches the worked example: Tue notice, Fri leave, Thu is a holiday", () => {
    // Tue 2026-09-08, Wed 09, Thu 10 (holiday), Fri 11 = leave date.
    const count = countQualifyingNoticeDays("2026-09-08", "2026-09-11", MON_FRI, ["2026-09-10"]);
    expect(count).toBe(3); // Tue, Wed, Thu all qualify
  });

  it("counts the informed day itself as day 1", () => {
    // Informed and leave date are adjacent working days.
    const count = countQualifyingNoticeDays("2026-09-10", "2026-09-11", MON_FRI, []);
    expect(count).toBe(1);
  });

  it("returns 0 when notice is given on the leave date itself (no advance notice)", () => {
    expect(countQualifyingNoticeDays("2026-09-11", "2026-09-11", MON_FRI, [])).toBe(0);
  });

  it("returns 0 when the leave date is before the informed date", () => {
    expect(countQualifyingNoticeDays("2026-09-11", "2026-09-08", MON_FRI, [])).toBe(0);
  });

  it("does not count a plain non-working day that isn't a logged holiday", () => {
    // Informed Saturday, leave the following Tuesday: Sat/Sun don't count,
    // only Monday does.
    const count = countQualifyingNoticeDays("2026-09-12", "2026-09-15", MON_FRI, []);
    expect(count).toBe(1); // just Monday the 14th
  });

  it("counts a holiday that falls on what would otherwise be a non-working day", () => {
    // Same window as above, but Sunday the 13th is now a logged holiday.
    const count = countQualifyingNoticeDays("2026-09-12", "2026-09-15", MON_FRI, ["2026-09-13"]);
    expect(count).toBe(2); // Sunday (holiday) + Monday
  });

  it("counts every qualifying day across a longer window", () => {
    // Mon 2026-09-07 through Fri 2026-09-18 (leave date), 8 working weekdays
    // in between (07,08,09,10,11,14,15,16,17) minus... compute directly:
    const count = countQualifyingNoticeDays("2026-09-07", "2026-09-18", MON_FRI, []);
    // Mon07,Tue08,Wed09,Thu10,Fri11,Mon14,Tue15,Wed16,Thu17 = 9 weekdays
    expect(count).toBe(9);
  });
});

describe("assessNotice", () => {
  it("is not_required when no policy is configured", () => {
    expect(assessNotice("2026-09-08", "2026-09-11", MON_FRI, [], null)).toEqual({ status: "not_required" });
  });

  it("is sufficient when qualifying days exactly meets the requirement (boundary: N)", () => {
    const result = assessNotice("2026-09-08", "2026-09-11", MON_FRI, ["2026-09-10"], 3);
    expect(result).toEqual({ status: "sufficient", qualifyingDays: 3, requiredDays: 3 });
  });

  it("is insufficient when one qualifying day short of the requirement (boundary: N-1)", () => {
    // Informed Wed instead of Tue -> only Wed, Thu(holiday) = 2 qualifying days for a 3-day policy.
    const result = assessNotice("2026-09-09", "2026-09-11", MON_FRI, ["2026-09-10"], 3);
    expect(result).toEqual({ status: "insufficient", qualifyingDays: 2, requiredDays: 3 });
  });

  it("is insufficient with 0 qualifying days when there is no advance notice at all", () => {
    const result = assessNotice("2026-09-11", "2026-09-11", MON_FRI, [], 3);
    expect(result).toEqual({ status: "insufficient", qualifyingDays: 0, requiredDays: 3 });
  });

  it("is sufficient when notice comfortably exceeds the requirement", () => {
    const result = assessNotice("2026-09-01", "2026-09-11", MON_FRI, ["2026-09-10"], 3);
    expect(result.status).toBe("sufficient");
  });
});

describe("describeNotice", () => {
  it("produces a plain-language explanation for insufficient notice", () => {
    const text = describeNotice({ status: "insufficient", qualifyingDays: 1, requiredDays: 3 });
    expect(text).toContain("1 qualifying day");
    expect(text).toContain("minimum required notice is 3 days");
  });

  it("uses singular/plural correctly", () => {
    expect(describeNotice({ status: "sufficient", qualifyingDays: 1, requiredDays: 1 })).toContain("1 qualifying day ");
    expect(describeNotice({ status: "sufficient", qualifyingDays: 2, requiredDays: 1 })).toContain("2 qualifying days");
  });
});

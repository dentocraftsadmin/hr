/**
 * Counts "qualifying days" of advance notice for a leave request: days that
 * are either a normal working day (per the employee's shift) or an official
 * company holiday. A plain non-working day (e.g. a weekly off that isn't
 * also a logged holiday) does not count.
 *
 * Counting is inclusive of the day notice was given (that's day 1) and
 * exclusive of the leave date itself — informing on the day the leave
 * starts is 0 days of notice, not 1.
 *
 * This is the same calculation `finalize_attendance_day()` (see
 * supabase/migrations/20260911130000_leave_notice_period.sql) performs in
 * SQL to actually decide whether a deduction applies — that's the
 * authoritative, persisted decision. This TypeScript copy exists so the
 * exact same rule can be: (a) unit tested without a live database, and
 * (b) shown to an employee in real time on the leave request form, before
 * they submit, using the same words the eventual scoring decision will use.
 * If you change this rule, change both.
 *
 * @param informedDate  the date the leave was requested (YYYY-MM-DD)
 * @param leaveDate     the date the leave starts (YYYY-MM-DD)
 * @param workingDays   the employee's shift working days, 0=Sunday..6=Saturday
 * @param holidayDates  active holiday dates applicable to the employee (YYYY-MM-DD)
 */
export function countQualifyingNoticeDays(
  informedDate: string,
  leaveDate: string,
  workingDays: number[],
  holidayDates: string[]
): number {
  const holidays = new Set(holidayDates);
  const start = new Date(informedDate + "T00:00:00Z");
  const end = new Date(leaveDate + "T00:00:00Z");

  if (start >= end) return 0;

  let count = 0;
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (workingDays.includes(dow) || holidays.has(iso)) {
      count++;
    }
  }
  return count;
}

export type NoticeAssessment =
  | { status: "sufficient"; qualifyingDays: number; requiredDays: number }
  | { status: "insufficient"; qualifyingDays: number; requiredDays: number }
  | { status: "not_required" };

/** requiredDays is app_settings.leave_notice_days — null means the policy
 * isn't configured, so the rule doesn't apply to anything (safe no-op,
 * same convention as the other optional settings in this app). */
export function assessNotice(
  informedDate: string,
  leaveDate: string,
  workingDays: number[],
  holidayDates: string[],
  requiredDays: number | null
): NoticeAssessment {
  if (requiredDays === null) return { status: "not_required" };
  const qualifyingDays = countQualifyingNoticeDays(informedDate, leaveDate, workingDays, holidayDates);
  return qualifyingDays >= requiredDays
    ? { status: "sufficient", qualifyingDays, requiredDays }
    : { status: "insufficient", qualifyingDays, requiredDays };
}

export function describeNotice(assessment: NoticeAssessment): string {
  switch (assessment.status) {
    case "not_required":
      return "No minimum notice period is configured right now.";
    case "sufficient":
      return `${assessment.qualifyingDays} qualifying ${assessment.qualifyingDays === 1 ? "day" : "days"} of notice given — meets the ${assessment.requiredDays}-day minimum. No score impact.`;
    case "insufficient":
      return `Only ${assessment.qualifyingDays} qualifying ${assessment.qualifyingDays === 1 ? "day" : "days"} of notice given; minimum required notice is ${assessment.requiredDays} days. This may result in a score deduction.`;
  }
}

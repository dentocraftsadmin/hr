import { createAdminClient } from "@/lib/supabase/admin";

export type UpcomingBirthday = {
  employeeId: string;
  fullName: string;
  month: number;
  day: number;
  daysUntil: number; // 0 = today
};

/** Pure so it's unit-testable in isolation from the DB. todayUTC is a UTC
 * midnight timestamp in ms. Feb 29 in a non-leap year is treated as Feb 28
 * — a simple, documented convention rather than a silently arbitrary one. */
export function daysUntilNextOccurrence(month: number, day: number, todayUTC: number): number {
  const year = new Date(todayUTC).getUTCFullYear();

  function occurrenceInYear(y: number): number {
    const daysInMonth = new Date(Date.UTC(y, month, 0)).getUTCDate();
    const effectiveDay = Math.min(day, daysInMonth);
    return Date.UTC(y, month - 1, effectiveDay);
  }

  let occurrence = occurrenceInYear(year);
  if (occurrence < todayUTC) occurrence = occurrenceInYear(year + 1);
  return Math.round((occurrence - todayUTC) / (24 * 60 * 60 * 1000));
}

/** Every active employee's birthday is visible to every other employee —
 * that's the point (a shared team calendar), but employees RLS otherwise
 * blocks all cross-employee reads by design (see the security hardening
 * notes in CLAUDE.md). This is the same narrow, server-mediated exception
 * already used for /register's office list and /rules' settings: the admin
 * client is used deliberately, and only name + month/day ever leave here —
 * nothing else about a teammate is exposed through this path. Recurs
 * annually by construction, since only month/day (never year) drive the
 * ordering; birth_year is never read here. */
export async function getUpcomingBirthdays(): Promise<UpcomingBirthday[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("employees")
    .select("id, full_name, birth_month, birth_day")
    .eq("employment_status", "active")
    .not("birth_month", "is", null)
    .not("birth_day", "is", null);

  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return (data ?? [])
    .map((e) => ({
      employeeId: e.id as string,
      fullName: e.full_name as string,
      month: e.birth_month as number,
      day: e.birth_day as number,
      daysUntil: daysUntilNextOccurrence(e.birth_month as number, e.birth_day as number, todayUTC),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function describeBirthday(b: Pick<UpcomingBirthday, "month" | "day" | "daysUntil">): string {
  const date = `${MONTH_NAMES[b.month - 1]} ${b.day}`;
  if (b.daysUntil === 0) return `${date} · today`;
  if (b.daysUntil === 1) return `${date} · tomorrow`;
  return `${date} · in ${b.daysUntil} days`;
}

import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToEmployee } from "@/lib/notifications/send";
import { minutesSinceMidnight, timeToMinutes } from "@/lib/notifications/time";

type ReminderType = "punch_in_reminder" | "punch_out_reminder" | "missed_punch_reminder";

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Runs every ~10 minutes (triggered by Supabase pg_cron, not Vercel Cron —
 * see the notifications migration for why). Push is a convenience layer:
 * every check here only reads state the attendance/leave/holiday flows
 * already produce, and a failure to send blocks nothing else. */
export async function GET(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();
  const { data: settings } = await admin.from("app_settings").select("timezone").eq("id", 1).single();
  const timeZone = settings?.timezone ?? "Asia/Kolkata";

  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  const nowMinutes = minutesSinceMidnight(now, timeZone);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();

  const { data: employees } = await admin
    .from("employees")
    .select(
      `id,
       shift:shifts(start_time, end_time, working_days),
       notification_preferences(push_enabled, remind_punch_in, remind_punch_in_minutes_before, remind_punch_out, remind_missed_punch),
       attendance_days(punch_in_event_id, punch_out_event_id, date)`
    )
    .eq("employment_status", "active");

  const { data: holidaysToday } = await admin.from("holidays").select("applies_to_office_id").eq("date", today).eq("is_active", true);
  const { data: approvedLeaveToday } = await admin
    .from("leave_requests")
    .select("employee_id")
    .eq("status", "approved")
    .lte("from_date", today)
    .gte("to_date", today);
  const onLeaveIds = new Set((approvedLeaveToday ?? []).map((r) => r.employee_id));
  const companyWideHoliday = (holidaysToday ?? []).some((h) => h.applies_to_office_id === null);

  const { data: alreadySent } = await admin.from("notification_log").select("employee_id, type").eq("date", today);
  const sentSet = new Set((alreadySent ?? []).map((r) => `${r.employee_id}:${r.type}`));

  let sent = 0;

  for (const emp of employees ?? []) {
    const prefs = one(emp.notification_preferences);
    if (!prefs?.push_enabled) continue;

    const shift = one(emp.shift);
    if (!shift || !shift.working_days.includes(dow)) continue;
    if (companyWideHoliday || onLeaveIds.has(emp.id)) continue;

    const todayRow = (emp.attendance_days ?? []).find((d) => d.date === today);
    const shiftStart = timeToMinutes(shift.start_time);
    const shiftEnd = timeToMinutes(shift.end_time);

    const trySend = async (type: ReminderType, title: string, body: string) => {
      const key = `${emp.id}:${type}`;
      if (sentSet.has(key)) return;
      await sendPushToEmployee(emp.id, { title, body, url: "/dashboard" });
      await admin.from("notification_log").insert({ employee_id: emp.id, date: today, type });
      sentSet.add(key);
      sent += 1;
    };

    if (!todayRow?.punch_in_event_id) {
      if (prefs.remind_punch_in && nowMinutes >= shiftStart - prefs.remind_punch_in_minutes_before) {
        await trySend("punch_in_reminder", "Time to punch in", "Your shift starts soon — don't forget to punch in.");
      }
      if (prefs.remind_missed_punch && nowMinutes >= shiftStart + 30) {
        await trySend("missed_punch_reminder", "You haven't punched in", "Your shift started a while ago and there's no punch-in yet.");
      }
    } else if (!todayRow.punch_out_event_id && prefs.remind_punch_out && nowMinutes >= shiftEnd) {
      await trySend("punch_out_reminder", "Time to punch out", "Your shift has ended — don't forget to punch out.");
    }
  }

  return NextResponse.json({ date: today, sent });
}

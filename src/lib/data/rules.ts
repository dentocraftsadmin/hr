import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RulesData = {
  fullDayHours: number;
  halfDayMinHours: number;
  leaveNoticeDays: number | null;
  lateArrivalPoints: number;
  insufficientNoticePoints: number;
  unapprovedAbsencePoints: number;
};

/**
 * Every number shown on the Rules page is read live from the database, so
 * it can never drift out of sync with what the system actually enforces.
 *
 * app_settings is admin-only under RLS (it also holds cron_secret and
 * app_base_url in the same row), so a plain employee's normal client can't
 * read it — but full_day_hours/half_day_min_hours/leave_notice_days are
 * genuinely non-sensitive policy values every employee needs to see here.
 * Rather than loosen the whole-row RLS policy (which would also expose
 * cron_secret to every employee), this reads only those three named
 * columns with the admin client, server-side only, same narrow exception
 * already used for the public registration page's office list.
 */
export async function getRulesData(): Promise<RulesData> {
  const admin = createAdminClient();
  const supabase = await createClient();

  const [{ data: settings }, { data: rules }] = await Promise.all([
    admin.from("app_settings").select("full_day_hours, half_day_min_hours, leave_notice_days").eq("id", 1).single(),
    supabase.from("point_rules").select("code, points").eq("is_active", true),
  ]);

  const find = (code: string) => Number(rules?.find((r) => r.code === code)?.points ?? 0);

  return {
    fullDayHours: Number(settings?.full_day_hours ?? 0),
    halfDayMinHours: Number(settings?.half_day_min_hours ?? 0),
    leaveNoticeDays: settings?.leave_notice_days ?? null,
    lateArrivalPoints: find("LATE_ARRIVAL"),
    insufficientNoticePoints: find("LATE_INSUFFICIENT_NOTICE_LEAVE"),
    unapprovedAbsencePoints: find("UNAPPROVED_ABSENCE"),
  };
}

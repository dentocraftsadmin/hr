import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Runs once daily for the day that just ended: marks any active employee
 * with no attendance record for that (working, non-holiday, non-leave) day
 * as absent, and flags any punch-in with no matching punch-out. Everything
 * else about a day's attendance is decided by submit_punch() at punch
 * time — this only fills in the gap punches can't cover: total silence. */
export async function GET(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();

  const { data: settings } = await admin.from("app_settings").select("timezone").eq("id", 1).single();
  const timeZone = settings?.timezone ?? "Asia/Kolkata";
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone }).format(yesterday);

  const { data, error } = await admin.rpc("finalize_attendance_day", { p_date: dateStr });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ date: dateStr, marked_absent: data?.length ?? 0 });
}

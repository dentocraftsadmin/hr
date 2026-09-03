import { createClient } from "@/lib/supabase/server";

/** "Today" in the company's configured timezone (defaults to Asia/Kolkata),
 * not the server process's own timezone — matches the bucketing submit_punch()
 * uses on the database side. */
export async function companyToday(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("timezone").eq("id", 1).single();
  const timeZone = data?.timezone ?? "Asia/Kolkata";
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export type TodayAttendance = {
  punchedIn: boolean;
  punchedOut: boolean;
  isLate: boolean;
  locationStatus: string;
  dayType: string;
  hoursWorked: number | null;
};

export async function getTodayAttendance(employeeId: string): Promise<TodayAttendance | null> {
  const supabase = await createClient();
  const today = await companyToday();

  const { data } = await supabase
    .from("attendance_days")
    .select("punch_in_event_id, punch_out_event_id, is_late, location_status, day_type, hours_worked")
    .eq("employee_id", employeeId)
    .eq("date", today)
    .maybeSingle();

  if (!data) return null;

  return {
    punchedIn: !!data.punch_in_event_id,
    punchedOut: !!data.punch_out_event_id,
    isLate: data.is_late,
    locationStatus: data.location_status,
    dayType: data.day_type,
    hoursWorked: data.hours_worked,
  };
}

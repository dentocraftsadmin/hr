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

/** Whether this employee has anywhere to punch at all. submit_punch()
 * itself already rejects a punch with no authorized office, but checking
 * this before the dashboard even offers the button means an employee never
 * burns a camera + GPS capture only to be told at the very end that it
 * could never have worked. */
export async function hasAssignedOffice(employeeId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("employee_offices")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId);
  return (count ?? 0) > 0;
}

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

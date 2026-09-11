import { createClient } from "@/lib/supabase/server";

export async function listLeaveTypes() {
  const supabase = await createClient();
  const { data } = await supabase.from("leave_types").select("*").eq("is_active", true).order("name");
  return data ?? [];
}

export async function listHolidays() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holidays")
    .select("*, office:offices(name)")
    .eq("is_active", true)
    .order("date");
  return data ?? [];
}

/** null means the notice-period rule isn't configured — leave is never
 * scored on timing until HR sets this. */
export async function getLeaveNoticeDays(): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("leave_notice_days").eq("id", 1).single();
  return data?.leave_notice_days ?? null;
}

/** The employee's own shift working days, for the live notice-period
 * preview on the leave request form — same working_days used by
 * finalize_attendance_day() and count_qualifying_notice_days() server-side. */
export async function getEmployeeWorkingDays(employeeId: string): Promise<number[]> {
  const supabase = await createClient();
  const { data: employee } = await supabase.from("employees").select("shift_id").eq("id", employeeId).single();
  if (!employee?.shift_id) return [1, 2, 3, 4, 5]; // no shift assigned yet — mirror the server-side fallback
  const { data: shift } = await supabase.from("shifts").select("working_days").eq("id", employee.shift_id).single();
  return shift?.working_days ?? [1, 2, 3, 4, 5];
}

export async function listOwnLeaveRequests(employeeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leave_requests")
    .select("*, leave_type:leave_types(name)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listAllLeaveRequests(status?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("leave_requests")
    .select("*, leave_type:leave_types(name), employee:employees(full_name)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return data ?? [];
}

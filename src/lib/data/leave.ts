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

function daysBetween(from: string, to: string, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.round(ms / 86400000) + 1;
}

export type LeaveBalance = { leaveTypeId: string; name: string; quota: number; used: number; remaining: number };

/** Remaining balance is always computed from approved requests, never a
 * stored counter — see architecture notes on why. */
export async function getLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [{ data: types }, { data: overrides }, { data: approved }] = await Promise.all([
    supabase.from("leave_types").select("*").eq("is_active", true).order("name"),
    supabase.from("employee_leave_balances").select("*").eq("employee_id", employeeId).eq("year", year),
    supabase
      .from("leave_requests")
      .select("leave_type_id, from_date, to_date, is_half_day")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("from_date", `${year}-01-01`)
      .lte("from_date", `${year}-12-31`),
  ]);

  return (types ?? []).map((type) => {
    const override = overrides?.find((o) => o.leave_type_id === type.id);
    const quota = override?.quota ?? type.annual_quota;
    const used = (approved ?? [])
      .filter((r) => r.leave_type_id === type.id)
      .reduce((sum, r) => sum + daysBetween(r.from_date, r.to_date, r.is_half_day), 0);
    return { leaveTypeId: type.id, name: type.name, quota, used, remaining: quota - used };
  });
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

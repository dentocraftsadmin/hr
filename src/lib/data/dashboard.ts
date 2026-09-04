import { createClient } from "@/lib/supabase/server";
import { companyToday } from "@/lib/data/attendance";

export type DashboardStats = {
  activeEmployees: number;
  punchedInToday: number;
  lateToday: number;
  pendingLeave: number;
  lowScoreCount: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const today = await companyToday();

  const [{ count: activeEmployees }, { data: todayRows }, { count: pendingLeave }, { data: ledger }] =
    await Promise.all([
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("employment_status", "active"),
      supabase.from("attendance_days").select("punch_in_event_id, is_late").eq("date", today),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("points_ledger").select("employee_id, points"),
    ]);

  const totals = new Map<string, number>();
  for (const row of ledger ?? []) {
    totals.set(row.employee_id, (totals.get(row.employee_id) ?? 0) + Number(row.points));
  }
  const lowScoreCount = [...totals.values()].filter((total) => 100 + total < 70).length;

  return {
    activeEmployees: activeEmployees ?? 0,
    punchedInToday: (todayRows ?? []).filter((r) => r.punch_in_event_id).length,
    lateToday: (todayRows ?? []).filter((r) => r.is_late).length,
    pendingLeave: pendingLeave ?? 0,
    lowScoreCount,
  };
}

export async function listFlaggedAttendanceDays() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance_days")
    .select("*, employee:employees(full_name)")
    .eq("is_flagged", true)
    .order("date", { ascending: false })
    .limit(30);
  return data ?? [];
}

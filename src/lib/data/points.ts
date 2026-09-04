import { createClient } from "@/lib/supabase/server";

/** Score is always computed from the ledger, never a stored running total —
 * see CLAUDE.md. Clamped to [0, 100], starting from a baseline of 100. */
export function scoreFromPoints(totalPoints: number): number {
  return Math.max(0, Math.min(100, 100 + totalPoints));
}

export async function getComplianceScore(employeeId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("points_ledger").select("points").eq("employee_id", employeeId);
  const total = (data ?? []).reduce((sum, row) => sum + Number(row.points), 0);
  return scoreFromPoints(total);
}

export async function getPointsHistory(employeeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("points_ledger")
    .select("*, point_rule:point_rules(code, description)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export type EmployeeScore = { id: string; full_name: string; score: number };

export async function listEmployeeScores(): Promise<EmployeeScore[]> {
  const supabase = await createClient();
  const [{ data: employees }, { data: ledger }] = await Promise.all([
    supabase.from("employees").select("id, full_name").eq("employment_status", "active").order("full_name"),
    supabase.from("points_ledger").select("employee_id, points"),
  ]);

  const totals = new Map<string, number>();
  for (const row of ledger ?? []) {
    totals.set(row.employee_id, (totals.get(row.employee_id) ?? 0) + Number(row.points));
  }

  return (employees ?? []).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    score: scoreFromPoints(totals.get(e.id) ?? 0),
  }));
}

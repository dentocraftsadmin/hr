import { createClient } from "@/lib/supabase/server";

export type EmployeeNotificationStatus = "active" | "not_enabled";

/** "Active" means the employee both opted in (push_enabled) and currently
 * has at least one stored subscription — either alone can be stale (a
 * toggle left on after unsubscribing elsewhere, or a subscription row from
 * before the preference existed), so both are required for the status HR
 * sees to mean "a reminder or broadcast can actually reach this person
 * right now." Uses the normal per-request client: RLS already grants admin
 * full read access to both tables. */
export async function listEmployeeNotificationStatuses(): Promise<Record<string, EmployeeNotificationStatus>> {
  const supabase = await createClient();
  const [{ data: prefs }, { data: subs }] = await Promise.all([
    supabase.from("notification_preferences").select("employee_id").eq("push_enabled", true),
    supabase.from("push_subscriptions").select("employee_id").not("employee_id", "is", null),
  ]);

  const enabled = new Set((prefs ?? []).map((p) => p.employee_id));
  const subscribed = new Set((subs ?? []).map((s) => s.employee_id as string));

  const statuses: Record<string, EmployeeNotificationStatus> = {};
  for (const id of subscribed) {
    statuses[id] = enabled.has(id) ? "active" : "not_enabled";
  }
  return statuses;
}

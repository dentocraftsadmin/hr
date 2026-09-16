"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";

/**
 * Marks the signed-in employee as having seen the first-login guided tour
 * (finished or skipped — both count, so it never auto-shows again). The
 * write goes through the service role rather than the employee's own
 * session: `employees` UPDATE RLS is admin-only by design (see the
 * security-hardening migration's notes on why a blanket self-update was
 * removed), so this is the narrow, single-column, server-mediated
 * exception that note anticipated — not a reopening of that policy.
 */
export async function markTourSeen(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("employee_id").eq("id", user.id).single();
  if (!profile?.employee_id) return { ok: false, error: "No employee record for this account." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("employees")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", profile.employee_id);
  if (error) return { ok: false, error: "Could not save tour progress." };

  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { adjustScoreSchema } from "@/lib/validation/points";
import type { ActionResult } from "./auth";

/** Manual score adjustment — a plain points_ledger row with is_override and
 * a mandatory reason, exactly like every other entry. Never edits or
 * deletes an existing row, so the ledger stays a complete audit trail the
 * employee can read in full. */
export async function adjustScore(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = adjustScoreSchema.safeParse({
    employeeId: formData.get("employeeId"),
    points: formData.get("points"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await admin.supabase.from("points_ledger").insert({
    employee_id: parsed.data.employeeId,
    points: parsed.data.points,
    reason: parsed.data.reason,
    is_override: true,
    created_by: admin.authId,
  });
  if (error) return { ok: false, error: "Could not save the adjustment." };

  revalidatePath("/admin/points");
  revalidatePath("/dashboard");
  return { ok: true };
}

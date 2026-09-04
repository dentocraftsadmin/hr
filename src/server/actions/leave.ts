"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data/require-admin";
import {
  createLeaveRequestSchema,
  leaveRequestIdSchema,
  reviewLeaveRequestSchema,
} from "@/lib/validation/leave";
import type { ActionResult } from "./auth";

export async function createLeaveRequest(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("employee_id").eq("id", user.id).single();
  if (!profile?.employee_id) return { ok: false, error: "No employee record for this account." };

  const parsed = createLeaveRequestSchema.safeParse({
    leave_type_id: formData.get("leave_type_id"),
    from_date: formData.get("from_date"),
    to_date: formData.get("to_date"),
    is_half_day: formData.get("is_half_day") === "on",
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: profile.employee_id,
    leave_type_id: parsed.data.leave_type_id,
    from_date: parsed.data.from_date,
    to_date: parsed.data.to_date,
    is_half_day: parsed.data.is_half_day,
    reason: parsed.data.reason || null,
  });
  if (error) return { ok: false, error: "Could not submit the leave request." };

  revalidatePath("/dashboard/leave");
  revalidatePath("/admin/leave");
  return { ok: true };
}

/** Employees may only withdraw a request that's still pending — once HR has
 * acted on it, only HR can change its status further. */
export async function cancelLeaveRequest(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = leaveRequestIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { data: profile } = await supabase.from("profiles").select("employee_id").eq("id", user.id).single();
  const { data: existing } = await supabase
    .from("leave_requests")
    .select("employee_id, status")
    .eq("id", parsed.data.id)
    .single();

  if (!existing || existing.employee_id !== profile?.employee_id) {
    return { ok: false, error: "Not found." };
  }
  if (existing.status !== "pending") {
    return { ok: false, error: "Only a pending request can be withdrawn — contact HR." };
  }

  const { error } = await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not withdraw the request." };

  revalidatePath("/dashboard/leave");
  return { ok: true };
}

export async function reviewLeaveRequest(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = reviewLeaveRequestSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    admin_note: formData.get("admin_note"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await admin.supabase
    .from("leave_requests")
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.admin_note || null,
      reviewed_by: admin.authId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not update the request." };

  await admin.supabase.from("audit_logs").insert({
    actor_id: admin.authId,
    action: `leave.${parsed.data.status}`,
    entity_table: "leave_requests",
    entity_id: parsed.data.id,
  });

  revalidatePath("/admin/leave");
  return { ok: true };
}

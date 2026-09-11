"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import type { ActionResult } from "./auth";

export async function getLeaveNoticePolicy(): Promise<{ days: number | null }> {
  const admin = await requireAdmin();
  if (!admin.ok) return { days: null };
  const { data } = await admin.supabase.from("app_settings").select("leave_notice_days").eq("id", 1).single();
  return { days: data?.leave_notice_days ?? null };
}

export async function setLeaveNoticeDays(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const raw = formData.get("days");
  const clear = formData.get("clear") === "true";

  let days: number | null = null;
  if (!clear) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 60) {
      return { ok: false, error: "Enter a whole number of days between 0 and 60." };
    }
    days = parsed;
  }

  const { data: before } = await admin.supabase.from("app_settings").select("leave_notice_days").eq("id", 1).single();

  const { error } = await admin.supabase.from("app_settings").update({ leave_notice_days: days }).eq("id", 1);
  if (error) return { ok: false, error: "Could not update the notice period." };

  await admin.supabase.from("audit_logs").insert({
    actor_id: admin.authId,
    action: "app_settings.set_leave_notice_days",
    entity_table: "app_settings",
    entity_id: null,
    before_state: { leave_notice_days: before?.leave_notice_days ?? null },
    after_state: { leave_notice_days: days },
  });

  revalidatePath("/admin/leave");
  return { ok: true };
}

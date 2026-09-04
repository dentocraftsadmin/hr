"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { correctAttendanceDaySchema } from "@/lib/validation/attendance-correction";
import type { ActionResult } from "./auth";

/** The only way attendance_days is ever changed after the fact — always
 * logged with a full before/after snapshot and a mandatory reason, never a
 * silent edit. Clears is_flagged, since a correction is HR resolving
 * exactly the thing that got flagged. */
export async function correctAttendanceDay(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = correctAttendanceDaySchema.safeParse({
    attendanceDayId: formData.get("attendanceDayId"),
    day_type: formData.get("day_type"),
    hours_worked: formData.get("hours_worked") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: before } = await admin.supabase
    .from("attendance_days")
    .select("*")
    .eq("id", parsed.data.attendanceDayId)
    .single();
  if (!before) return { ok: false, error: "Attendance record not found." };

  const after = {
    day_type: parsed.data.day_type,
    hours_worked: parsed.data.hours_worked ?? before.hours_worked,
    is_flagged: false,
  };

  const { error } = await admin.supabase
    .from("attendance_days")
    .update(after)
    .eq("id", parsed.data.attendanceDayId);
  if (error) return { ok: false, error: "Could not save the correction." };

  await admin.supabase.from("attendance_corrections").insert({
    attendance_day_id: parsed.data.attendanceDayId,
    corrected_by: admin.authId,
    previous_state: before,
    new_state: after,
    reason: parsed.data.reason,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

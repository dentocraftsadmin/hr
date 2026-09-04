"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { holidaySchema, holidayIdSchema } from "@/lib/validation/leave";
import type { ActionResult } from "./auth";

export async function createHoliday(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = holidaySchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    applies_to_office_id: formData.get("applies_to_office_id"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await admin.supabase.from("holidays").insert({
    name: parsed.data.name,
    date: parsed.data.date,
    applies_to_office_id: parsed.data.applies_to_office_id || null,
  });
  if (error) return { ok: false, error: "Could not save the holiday." };

  revalidatePath("/admin/holidays");
  revalidatePath("/dashboard/leave");
  return { ok: true };
}

export async function removeHoliday(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = holidayIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { error } = await admin.supabase.from("holidays").update({ is_active: false }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not remove the holiday." };

  revalidatePath("/admin/holidays");
  revalidatePath("/dashboard/leave");
  return { ok: true };
}

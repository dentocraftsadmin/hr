"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { shiftSchema, shiftIdSchema } from "@/lib/validation/shifts";
import type { ActionResult } from "./auth";

function parseWorkingDays(formData: FormData): number[] {
  return formData
    .getAll("working_days")
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n));
}

export async function createShift(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = shiftSchema.safeParse({
    name: formData.get("name"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    working_days: parseWorkingDays(formData),
    late_buffer_minutes: formData.get("late_buffer_minutes"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await admin.supabase.from("shifts").insert(parsed.data);
  if (error) return { ok: false, error: error.message.includes("duplicate") ? "A shift with that name already exists." : "Could not save." };

  revalidatePath("/admin/shifts");
  return { ok: true };
}

export async function toggleShift(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = shiftIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { data: current } = await admin.supabase
    .from("shifts")
    .select("is_active")
    .eq("id", parsed.data.id)
    .single();
  if (!current) return { ok: false, error: "Not found." };

  const { error } = await admin.supabase
    .from("shifts")
    .update({ is_active: !current.is_active })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not update." };

  revalidatePath("/admin/shifts");
  return { ok: true };
}

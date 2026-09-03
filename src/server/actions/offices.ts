"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { officeSchema, officeIdSchema } from "@/lib/validation/offices";
import type { ActionResult } from "./auth";

export async function createOffice(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = officeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    radius_meters: formData.get("radius_meters"),
    default_shift_id: formData.get("default_shift_id"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await admin.supabase.from("offices").insert({
    name: parsed.data.name,
    code: parsed.data.code || null,
    address: parsed.data.address || null,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    radius_meters: parsed.data.radius_meters,
    default_shift_id: parsed.data.default_shift_id || null,
  });
  if (error) return { ok: false, error: error.message.includes("duplicate") ? "An office with that name or code already exists." : "Could not save." };

  revalidatePath("/admin/offices");
  return { ok: true };
}

export async function toggleOffice(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = officeIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { data: current } = await admin.supabase
    .from("offices")
    .select("is_active")
    .eq("id", parsed.data.id)
    .single();
  if (!current) return { ok: false, error: "Not found." };

  const { error } = await admin.supabase
    .from("offices")
    .update({ is_active: !current.is_active })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not update." };

  revalidatePath("/admin/offices");
  return { ok: true };
}

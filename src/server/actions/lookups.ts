"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { lookupSchema, lookupIdSchema } from "@/lib/validation/lookups";
import type { ActionResult } from "./auth";

type Table = "departments" | "designations";

async function createLookup(table: Table, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = lookupSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await admin.supabase.from(table).insert({ name: parsed.data.name });
  if (error) return { ok: false, error: error.message.includes("duplicate") ? "Already exists." : "Could not save." };

  revalidatePath("/admin/departments");
  revalidatePath("/admin/designations");
  return { ok: true };
}

async function toggleLookup(table: Table, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = lookupIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { data: current } = await admin.supabase
    .from(table)
    .select("is_active")
    .eq("id", parsed.data.id)
    .single();
  if (!current) return { ok: false, error: "Not found." };

  const { error } = await admin.supabase
    .from(table)
    .update({ is_active: !current.is_active })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not update." };

  revalidatePath("/admin/departments");
  revalidatePath("/admin/designations");
  return { ok: true };
}

export async function createDepartment(fd: FormData) {
  return createLookup("departments", fd);
}
export async function toggleDepartment(fd: FormData) {
  return toggleLookup("departments", fd);
}
export async function createDesignation(fd: FormData) {
  return createLookup("designations", fd);
}
export async function toggleDesignation(fd: FormData) {
  return toggleLookup("designations", fd);
}

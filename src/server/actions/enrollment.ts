"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import type { ActionResult } from "./auth";

function randomCode(): string {
  // Short, easy to read aloud/type — not a cryptographic secret, just a
  // shared gate an admin can rotate at will.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export async function getEnrollmentCode(): Promise<{ code: string | null }> {
  const admin = await requireAdmin();
  if (!admin.ok) return { code: null };
  const { data } = await admin.supabase.from("app_settings").select("employee_enrollment_code").eq("id", 1).single();
  return { code: data?.employee_enrollment_code ?? null };
}

export async function rotateEnrollmentCode(): Promise<ActionResult & { code?: string }> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const code = randomCode();
  const { error } = await admin.supabase.from("app_settings").update({ employee_enrollment_code: code }).eq("id", 1);
  if (error) return { ok: false, error: "Could not update the registration code." };

  await admin.supabase.from("audit_logs").insert({
    actor_id: admin.authId,
    action: "app_settings.rotate_enrollment_code",
    entity_table: "app_settings",
    entity_id: null,
  });

  revalidatePath("/admin/employees");
  return { ok: true, code };
}

export async function disableRegistration(): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.supabase.from("app_settings").update({ employee_enrollment_code: null }).eq("id", 1);
  if (error) return { ok: false, error: "Could not disable registration." };

  await admin.supabase.from("audit_logs").insert({
    actor_id: admin.authId,
    action: "app_settings.disable_enrollment_code",
    entity_table: "app_settings",
    entity_id: null,
  });

  revalidatePath("/admin/employees");
  return { ok: true };
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/auth/phone";
import { toAuthPassword } from "@/lib/auth/pin";
import { loginSchema, changePinSchema, resetPinSchema } from "@/lib/validation/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function login(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    phone: formData.get("phone"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    phone: toE164(parsed.data.phone),
    password: toAuthPassword(parsed.data.pin),
  });

  if (error) {
    // Supabase returns the same generic error for "no such user" and "wrong
    // password" — deliberately not distinguished here either, so the login
    // screen can't be used to enumerate registered phone numbers.
    return { ok: false, error: "Incorrect phone number or PIN." };
  }

  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Self-service: an employee changes their own PIN, re-verifying the current one first. */
export async function changeOwnPin(formData: FormData): Promise<ActionResult> {
  const parsed = changePinSchema.safeParse({
    currentPin: formData.get("currentPin"),
    newPin: formData.get("newPin"),
    confirmPin: formData.get("confirmPin"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.phone) {
    return { ok: false, error: "Not signed in." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    phone: user.phone,
    password: toAuthPassword(parsed.data.currentPin),
  });
  if (verifyError) {
    return { ok: false, error: "Current PIN is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: toAuthPassword(parsed.data.newPin),
  });
  if (updateError) {
    return { ok: false, error: "Could not update PIN. Try again." };
  }

  return { ok: true };
}

/** HR/admin action: reset a forgotten PIN for an employee. */
export async function resetEmployeePin(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = resetPinSchema.safeParse({
    employeeId: formData.get("employeeId"),
    newPin: formData.get("newPin"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("employee_id", parsed.data.employeeId)
    .single();
  if (!targetProfile) {
    return { ok: false, error: "Employee has no login account." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(targetProfile.id, {
    password: toAuthPassword(parsed.data.newPin),
  });
  if (error) {
    return { ok: false, error: "Could not reset PIN. Try again." };
  }

  await supabase.from("audit_logs").insert({
    actor_id: user!.id,
    action: "employee.pin_reset",
    entity_table: "employees",
    entity_id: parsed.data.employeeId,
  });

  return { ok: true };
}

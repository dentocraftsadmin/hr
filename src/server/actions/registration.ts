"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/auth/phone";
import { toAuthPassword } from "@/lib/auth/pin";
import { registerEmployeeSchema } from "@/lib/validation/registration";
import type { ActionResult } from "./auth";

/**
 * Public self-registration for employees. Reachable with no session at all
 * (see PUBLIC_PATHS in middleware.ts), so this is the one write path in the
 * app that has to defend itself entirely on its own — there's no admin
 * check to lean on. Two things make that safe:
 *
 * 1. profiles.role is hardcoded to "employee" below. This function never
 *    reads a role from formData, and registerEmployeeSchema has no role
 *    field at all, so there is no value a caller could submit that would
 *    change that.
 * 2. Registration only proceeds if the submitted code matches
 *    app_settings.employee_enrollment_code, checked with the admin client
 *    (that table is admin-only under RLS, so this is the only way to read
 *    it — an anon request has no other route to it either).
 *
 * Everything else mirrors createEmployee's shape: same idempotent-cleanup
 * pattern if a later step fails after an earlier one already wrote a row.
 */
export async function registerEmployee(formData: FormData): Promise<ActionResult> {
  const parsed = registerEmployeeSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    enrollment_code: formData.get("enrollment_code"),
    birth_year: formData.get("birth_year"),
    joining_date: formData.get("joining_date"),
    office_id: formData.get("office_id"),
    pin: formData.get("pin"),
    confirm_pin: formData.get("confirm_pin"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("app_settings")
    .select("employee_enrollment_code")
    .eq("id", 1)
    .single();

  const expectedCode = settings?.employee_enrollment_code?.trim();
  if (!expectedCode || data.enrollment_code.trim() !== expectedCode) {
    return { ok: false, error: "That registration code isn't valid. Check with HR for the current code." };
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({
      full_name: data.full_name,
      phone: data.phone,
      birth_year: data.birth_year,
      joining_date: data.joining_date,
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    return {
      ok: false,
      error: employeeError?.message.includes("duplicate")
        ? "That phone number is already registered. Try signing in instead."
        : "Could not create your account. Try again.",
    };
  }

  const { error: officeError } = await admin
    .from("employee_offices")
    .insert({ employee_id: employee.id, office_id: data.office_id, is_primary: true });
  if (officeError) {
    await admin.from("employees").delete().eq("id", employee.id);
    return { ok: false, error: "Could not assign your office. Try again." };
  }

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    phone: toE164(data.phone),
    password: toAuthPassword(data.pin),
    phone_confirm: true,
  });
  if (authError || !authUser.user) {
    await admin.from("employees").delete().eq("id", employee.id);
    return { ok: false, error: "Could not create your login. Try again." };
  }

  // Hardcoded, not derived from any client input — this is the whole
  // security property this action depends on.
  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    employee_id: employee.id,
    role: "employee",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("employees").delete().eq("id", employee.id);
    return { ok: false, error: "Could not finish setting up your account. Try again." };
  }

  await admin.from("audit_logs").insert({
    actor_id: authUser.user.id,
    action: "employee.self_register",
    entity_table: "employees",
    entity_id: employee.id,
  });

  return { ok: true };
}

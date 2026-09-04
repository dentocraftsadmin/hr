"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/auth/phone";
import { toAuthPassword } from "@/lib/auth/pin";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
  employeeIdSchema,
} from "@/lib/validation/employees";
import type { ActionResult } from "./auth";

/**
 * Creates the employee record, the office assignment, and the matching
 * Supabase Auth login (phone + PIN) in one action. Auth user creation can't
 * share a Postgres transaction with the table inserts, so on any failure
 * after the employee row is created, this cleans up what it already wrote
 * rather than leaving an orphaned record.
 */
export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = createEmployeeSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    pin: formData.get("pin"),
    birth_year: formData.get("birth_year"),
    department_id: formData.get("department_id"),
    designation_id: formData.get("designation_id"),
    shift_id: formData.get("shift_id"),
    office_id: formData.get("office_id"),
    joining_date: formData.get("joining_date"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const { data: employee, error: employeeError } = await admin.supabase
    .from("employees")
    .insert({
      full_name: data.full_name,
      phone: data.phone,
      birth_year: data.birth_year,
      department_id: data.department_id || null,
      designation_id: data.designation_id || null,
      shift_id: data.shift_id || null,
      joining_date: data.joining_date,
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    return {
      ok: false,
      error: employeeError?.message.includes("duplicate") ? "That phone number is already registered." : "Could not create employee.",
    };
  }

  const { error: officeError } = await admin.supabase
    .from("employee_offices")
    .insert({ employee_id: employee.id, office_id: data.office_id, is_primary: true });
  if (officeError) {
    await admin.supabase.from("employees").delete().eq("id", employee.id);
    return { ok: false, error: "Could not assign office." };
  }

  const authAdmin = createAdminClient();
  const { data: authUser, error: authError } = await authAdmin.auth.admin.createUser({
    phone: toE164(data.phone),
    password: toAuthPassword(data.pin),
    phone_confirm: true,
  });
  if (authError || !authUser.user) {
    await admin.supabase.from("employees").delete().eq("id", employee.id);
    return { ok: false, error: "Could not create login for this employee." };
  }

  const { error: profileError } = await admin.supabase.from("profiles").insert({
    id: authUser.user.id,
    employee_id: employee.id,
    role: "employee",
  });
  if (profileError) {
    await authAdmin.auth.admin.deleteUser(authUser.user.id);
    await admin.supabase.from("employees").delete().eq("id", employee.id);
    return { ok: false, error: "Could not finish setting up this employee." };
  }

  await admin.supabase.from("audit_logs").insert({
    actor_id: admin.authId,
    action: "employee.create",
    entity_table: "employees",
    entity_id: employee.id,
  });

  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function updateEmployee(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = updateEmployeeSchema.safeParse({
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    birth_year: formData.get("birth_year"),
    department_id: formData.get("department_id"),
    designation_id: formData.get("designation_id"),
    shift_id: formData.get("shift_id"),
    employment_status: formData.get("employment_status"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...fields } = parsed.data;

  const { data: before } = await admin.supabase.from("employees").select("*").eq("id", id).single();

  const { error } = await admin.supabase
    .from("employees")
    .update({
      full_name: fields.full_name,
      birth_year: fields.birth_year,
      department_id: fields.department_id || null,
      designation_id: fields.designation_id || null,
      shift_id: fields.shift_id || null,
      employment_status: fields.employment_status,
      leaving_date: fields.employment_status === "terminated" ? new Date().toISOString().slice(0, 10) : before?.leaving_date ?? null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not update employee." };

  await admin.supabase.from("audit_logs").insert({
    actor_id: admin.authId,
    action: "employee.update",
    entity_table: "employees",
    entity_id: id,
    before_state: before ?? null,
    after_state: fields,
  });

  revalidatePath("/admin/employees");
  return { ok: true };
}

/** Status-only update, used by the employee list's inline status dropdown —
 * deliberately separate from updateEmployee so it can never accidentally
 * clear department/designation/shift by omitting them from the form. */
export async function updateEmployeeStatus(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = updateEmployeeStatusSchema.safeParse({
    id: formData.get("id"),
    employment_status: formData.get("employment_status"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: before } = await admin.supabase
    .from("employees")
    .select("employment_status, leaving_date")
    .eq("id", parsed.data.id)
    .single();

  const { error } = await admin.supabase
    .from("employees")
    .update({
      employment_status: parsed.data.employment_status,
      leaving_date:
        parsed.data.employment_status === "terminated"
          ? new Date().toISOString().slice(0, 10)
          : (before?.leaving_date ?? null),
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not update status." };

  await admin.supabase.from("audit_logs").insert({
    actor_id: admin.authId,
    action: "employee.status_change",
    entity_table: "employees",
    entity_id: parsed.data.id,
    before_state: before ?? null,
    after_state: { employment_status: parsed.data.employment_status },
  });

  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function reassignEmployeeOffice(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const employeeId = employeeIdSchema.safeParse({ id: formData.get("employeeId") });
  const officeId = employeeIdSchema.safeParse({ id: formData.get("officeId") });
  if (!employeeId.success || !officeId.success) return { ok: false, error: "Invalid request." };

  await admin.supabase.from("employee_offices").delete().eq("employee_id", employeeId.data.id);
  const { error } = await admin.supabase
    .from("employee_offices")
    .insert({ employee_id: employeeId.data.id, office_id: officeId.data.id, is_primary: true });
  if (error) return { ok: false, error: "Could not reassign office." };

  revalidatePath("/admin/employees");
  return { ok: true };
}

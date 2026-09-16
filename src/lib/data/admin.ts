import { createClient } from "@/lib/supabase/server";
import { formatPersonName } from "@/lib/format/name";

export async function listDepartments() {
  const supabase = await createClient();
  const { data } = await supabase.from("departments").select("*").order("name");
  return data ?? [];
}

export async function listDesignations() {
  const supabase = await createClient();
  const { data } = await supabase.from("designations").select("*").order("name");
  return data ?? [];
}

export async function listShifts() {
  const supabase = await createClient();
  const { data } = await supabase.from("shifts").select("*").order("name");
  return data ?? [];
}

export async function listOffices() {
  const supabase = await createClient();
  const { data } = await supabase.from("offices").select("*").order("name");
  return data ?? [];
}

export async function listEmployees() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select(
      `id, full_name, phone, birth_year, employment_status, joining_date,
       department_id, designation_id, shift_id,
       department:departments(name), designation:designations(name), shift:shifts(name),
       employee_offices(office:offices(id, name))`
    )
    .order("full_name");
  // Defensive display-time normalization — every write path already stores
  // names title-cased (see lib/format/name.ts), this just covers any row
  // that predates that or was written outside the app.
  return (data ?? []).map((e) => ({ ...e, full_name: formatPersonName(e.full_name) }));
}

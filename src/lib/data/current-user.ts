import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  authId: string;
  role: "employee" | "admin";
  employee: {
    id: string;
    full_name: string;
    phone: string;
    department_id: string | null;
    designation_id: string | null;
    shift_id: string | null;
    employment_status: string;
  } | null;
};

/** Reads the signed-in user's profile + employee record. Null if signed out. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, employee:employees(id, full_name, phone, department_id, designation_id, shift_id, employment_status)"
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const employee = Array.isArray(profile.employee)
    ? (profile.employee[0] ?? null)
    : (profile.employee ?? null);

  return {
    authId: user.id,
    role: profile.role,
    employee,
  };
}

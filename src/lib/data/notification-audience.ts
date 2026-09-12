import { createAdminClient } from "@/lib/supabase/admin";

export type AudienceInput =
  | { type: "everyone" }
  | { type: "department"; departmentId: string }
  | { type: "office"; officeId: string }
  | { type: "department_office"; departmentId: string; officeId: string }
  | { type: "individual"; employeeId: string };

export type AudienceMember = { id: string; full_name: string };

/**
 * The one place audience membership is decided — every send path (preview,
 * immediate send, scheduled sweep) must go through this rather than trust a
 * client-supplied recipient list. The client only ever sends a
 * *description* of the audience (a department id, an office id, one
 * employee id); the actual employee rows always come from a fresh,
 * server-side query gated to employment_status = 'active', so there is no
 * way to smuggle extra recipients in by tampering with the request body.
 */
export async function resolveAudience(input: AudienceInput): Promise<AudienceMember[]> {
  const admin = createAdminClient();

  if (input.type === "individual") {
    const { data } = await admin
      .from("employees")
      .select("id, full_name")
      .eq("employment_status", "active")
      .eq("id", input.employeeId);
    return data ?? [];
  }

  const { data } = await admin
    .from("employees")
    .select("id, full_name, department_id, employee_offices(office_id)")
    .eq("employment_status", "active");

  let rows = data ?? [];

  if (input.type === "department" || input.type === "department_office") {
    rows = rows.filter((e) => e.department_id === input.departmentId);
  }
  if (input.type === "office" || input.type === "department_office") {
    const officeId = input.officeId;
    rows = rows.filter((e) => (e.employee_offices ?? []).some((o) => o.office_id === officeId));
  }

  return rows.map((e) => ({ id: e.id, full_name: e.full_name }));
}

export function describeAudience(
  input: AudienceInput,
  lookups: { departments: { id: string; name: string }[]; offices: { id: string; name: string }[]; employees: { id: string; full_name: string }[] }
): string {
  const dept = (id: string) => lookups.departments.find((d) => d.id === id)?.name ?? "Unknown department";
  const office = (id: string) => lookups.offices.find((o) => o.id === id)?.name ?? "Unknown office";
  const employee = (id: string) => lookups.employees.find((e) => e.id === id)?.full_name ?? "Unknown employee";

  switch (input.type) {
    case "everyone":
      return "Everyone";
    case "department":
      return `Department: ${dept(input.departmentId)}`;
    case "office":
      return `Office: ${office(input.officeId)}`;
    case "department_office":
      return `${dept(input.departmentId)} · ${office(input.officeId)}`;
    case "individual":
      return employee(input.employeeId);
  }
}

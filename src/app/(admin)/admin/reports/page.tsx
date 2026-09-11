import { createClient } from "@/lib/supabase/server";
import { listDepartments, listOffices } from "@/lib/data/admin";
import { Reports } from "@/components/admin/reports";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const [{ data: employees }, departments, offices] = await Promise.all([
    supabase.from("employees").select("id, full_name").order("full_name"),
    listDepartments(),
    listOffices(),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate spreadsheets straight from the underlying records — not just what's on screen."
      />
      <Reports
        employees={(employees ?? []).map((e) => ({ id: e.id, name: e.full_name }))}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        offices={offices.map((o) => ({ id: o.id, name: o.name }))}
      />
    </div>
  );
}

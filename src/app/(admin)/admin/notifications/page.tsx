import { createClient } from "@/lib/supabase/server";
import { listDepartments, listOffices } from "@/lib/data/admin";
import { listEmployeeNotificationStatuses } from "@/lib/data/notification-status";
import { listNotificationHistory } from "@/server/actions/notification-broadcasts";
import { NotificationComposer } from "@/components/admin/notification-composer";
import { NotificationHistory } from "@/components/admin/notification-history";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const [{ data: employeeRows }, departments, offices, statuses, history, { data: settings }] = await Promise.all([
    supabase.from("employees").select("id, full_name, department_id").eq("employment_status", "active").order("full_name"),
    listDepartments(),
    listOffices(),
    listEmployeeNotificationStatuses(),
    listNotificationHistory(),
    supabase.from("app_settings").select("timezone").eq("id", 1).single(),
  ]);

  const employees = (employeeRows ?? []).map((e) => ({
    id: e.id,
    name: e.full_name,
    department_id: e.department_id,
    status: statuses[e.id] ?? ("not_enabled" as const),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Compose a push notification for the whole team, a department, an office, or one employee."
      />

      <NotificationComposer
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        offices={offices.map((o) => ({ id: o.id, name: o.name }))}
        employees={employees}
        timezone={settings?.timezone ?? "Asia/Kolkata"}
      />

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">History</h2>
        <NotificationHistory
          broadcasts={history}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          offices={offices.map((o) => ({ id: o.id, name: o.name }))}
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        />
      </div>
    </div>
  );
}

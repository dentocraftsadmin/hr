import { Network } from "lucide-react";
import { listDepartments } from "@/lib/data/admin";
import { createDepartment, toggleDepartment } from "@/server/actions/lookups";
import { LookupManager } from "@/components/admin/lookup-manager";
import { PageHeader } from "@/components/ui/page-header";

export default async function DepartmentsPage() {
  const departments = await listDepartments();
  return (
    <div>
      <PageHeader
        title="Departments"
        description="How your organization is structured — assign employees to a department for reporting and filtering."
      />
      <LookupManager
        label="Departments"
        singular="Department"
        icon={<Network />}
        emptyDescription="Add departments to organize employees and filter reports by team."
        items={departments}
        createAction={createDepartment}
        toggleAction={toggleDepartment}
      />
    </div>
  );
}

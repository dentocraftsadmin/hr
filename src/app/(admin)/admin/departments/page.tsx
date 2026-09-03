import { listDepartments } from "@/lib/data/admin";
import { createDepartment, toggleDepartment } from "@/server/actions/lookups";
import { LookupManager } from "@/components/admin/lookup-manager";

export default async function DepartmentsPage() {
  const departments = await listDepartments();
  return (
    <LookupManager
      label="Departments"
      items={departments}
      createAction={createDepartment}
      toggleAction={toggleDepartment}
    />
  );
}

import { listEmployees, listDepartments, listDesignations, listShifts, listOffices } from "@/lib/data/admin";
import { AddEmployeeButton } from "@/components/admin/employee-create-form";
import { EmployeeTable } from "@/components/admin/employee-table";
import { PageHeader } from "@/components/ui/page-header";

export default async function EmployeesPage() {
  const [employees, departments, designations, shifts, offices] = await Promise.all([
    listEmployees(),
    listDepartments(),
    listDesignations(),
    listShifts(),
    listOffices(),
  ]);

  const activeDepartments = departments.filter((d) => d.is_active);
  const activeDesignations = designations.filter((d) => d.is_active);
  const activeShifts = shifts.filter((s) => s.is_active);
  const activeOffices = offices.filter((o) => o.is_active);

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`Manage your workforce, employee records and assignments · ${employees.length} ${employees.length === 1 ? "employee" : "employees"}`}
        actions={
          <AddEmployeeButton
            departments={activeDepartments}
            designations={activeDesignations}
            shifts={activeShifts}
            offices={activeOffices}
          />
        }
      />
      <EmployeeTable
        employees={employees}
        departments={activeDepartments}
        designations={activeDesignations}
        shifts={activeShifts}
        offices={activeOffices}
      />
    </div>
  );
}

import { listEmployees, listDepartments, listDesignations, listShifts, listOffices } from "@/lib/data/admin";
import { EmployeeCreateForm } from "@/components/admin/employee-create-form";
import { EmployeeTable } from "@/components/admin/employee-table";

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
      <h1 className="text-lg font-semibold text-foreground mb-4">Employees</h1>
      <EmployeeCreateForm
        departments={activeDepartments}
        designations={activeDesignations}
        shifts={activeShifts}
        offices={activeOffices}
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

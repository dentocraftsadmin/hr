import { listEmployees, listDepartments, listDesignations, listShifts, listOffices } from "@/lib/data/admin";
import { getEnrollmentCode } from "@/server/actions/enrollment";
import { AddEmployeeButton } from "@/components/admin/employee-create-form";
import { EmployeeTable } from "@/components/admin/employee-table";
import { EnrollmentCodeCard } from "@/components/admin/enrollment-code";
import { PageHeader } from "@/components/ui/page-header";

export default async function EmployeesPage() {
  const [employees, departments, designations, shifts, offices, { code }] = await Promise.all([
    listEmployees(),
    listDepartments(),
    listDesignations(),
    listShifts(),
    listOffices(),
    getEnrollmentCode(),
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

      <div className="mb-6 max-w-md">
        <EnrollmentCodeCard initialCode={code} />
      </div>

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

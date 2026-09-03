"use client";

import { useState, useTransition } from "react";
import { updateEmployee, updateEmployeeStatus, reassignEmployeeOffice } from "@/server/actions/employees";
import { resetEmployeePin } from "@/server/actions/auth";

type Option = { id: string; name: string };

type Employee = {
  id: string;
  full_name: string;
  phone: string;
  birth_year: number | null;
  employment_status: string;
  department_id: string | null;
  designation_id: string | null;
  shift_id: string | null;
  employee_offices: { office: { id: string; name: string } | { id: string; name: string }[] }[];
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function EmployeeTable({
  employees,
  departments,
  designations,
  shifts,
  offices,
}: {
  employees: Employee[];
  departments: Option[];
  designations: Option[];
  shifts: Option[];
  offices: Option[];
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Phone</th>
            <th className="px-4 py-2.5 font-medium">Department</th>
            <th className="px-4 py-2.5 font-medium">Designation</th>
            <th className="px-4 py-2.5 font-medium">Office</th>
            <th className="px-4 py-2.5 font-medium">Shift</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">PIN</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted">
                No employees yet.
              </td>
            </tr>
          )}
          {employees.map((emp) => (
            <EmployeeRow
              key={emp.id}
              employee={emp}
              departments={departments}
              designations={designations}
              shifts={shifts}
              offices={offices}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeRow({
  employee,
  departments,
  designations,
  shifts,
  offices,
}: {
  employee: Employee;
  departments: Option[];
  designations: Option[];
  shifts: Option[];
  offices: Option[];
}) {
  const [status, setStatus] = useState(employee.employment_status);
  const [departmentId, setDepartmentId] = useState(employee.department_id ?? "");
  const [designationId, setDesignationId] = useState(employee.designation_id ?? "");
  const [shiftId, setShiftId] = useState(employee.shift_id ?? "");
  const [officeId, setOfficeId] = useState(one(employee.employee_offices[0]?.office ?? null)?.id ?? "");
  const [showReset, setShowReset] = useState(false);
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveDetails(next: { department_id?: string; designation_id?: string; shift_id?: string }) {
    const formData = new FormData();
    formData.set("id", employee.id);
    formData.set("full_name", employee.full_name);
    formData.set("birth_year", String(employee.birth_year ?? ""));
    formData.set("employment_status", status);
    formData.set("department_id", next.department_id ?? departmentId);
    formData.set("designation_id", next.designation_id ?? designationId);
    formData.set("shift_id", next.shift_id ?? shiftId);
    startTransition(async () => { await updateEmployee(formData); });
  }

  function onStatusChange(next: string) {
    setStatus(next);
    const formData = new FormData();
    formData.set("id", employee.id);
    formData.set("employment_status", next);
    startTransition(async () => { await updateEmployeeStatus(formData); });
  }

  function onOfficeChange(next: string) {
    setOfficeId(next);
    const formData = new FormData();
    formData.set("employeeId", employee.id);
    formData.set("officeId", next);
    startTransition(async () => { await reassignEmployeeOffice(formData); });
  }

  function onResetPin() {
    setResetError(null);
    const formData = new FormData();
    formData.set("employeeId", employee.id);
    formData.set("newPin", resetPin);
    startTransition(async () => {
      const result = await resetEmployeePin(formData);
      if (!result.ok) {
        setResetError(result.error);
        return;
      }
      setShowReset(false);
      setResetPin("");
    });
  }

  const selectClass = "rounded-md border border-border bg-background px-2 py-1 text-xs max-w-[9rem]";

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="px-4 py-2.5 text-foreground whitespace-nowrap">{employee.full_name}</td>
      <td className="px-4 py-2.5 text-muted whitespace-nowrap">{employee.phone}</td>
      <td className="px-4 py-2.5">
        <select
          value={departmentId}
          disabled={isPending}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            saveDetails({ department_id: e.target.value });
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <select
          value={designationId}
          disabled={isPending}
          onChange={(e) => {
            setDesignationId(e.target.value);
            saveDetails({ designation_id: e.target.value });
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {designations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <select value={officeId} disabled={isPending} onChange={(e) => onOfficeChange(e.target.value)} className={selectClass}>
          <option value="">—</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <select
          value={shiftId}
          disabled={isPending}
          onChange={(e) => {
            setShiftId(e.target.value);
            saveDetails({ shift_id: e.target.value });
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} disabled={isPending} className={selectClass}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
      </td>
      <td className="px-4 py-2.5">
        {!showReset ? (
          <button onClick={() => setShowReset(true)} className="text-xs font-medium text-muted underline">
            Reset PIN
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              value={resetPin}
              onChange={(e) => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="New PIN"
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs tracking-widest"
            />
            <button
              onClick={onResetPin}
              disabled={isPending || resetPin.length !== 4}
              className="text-xs font-medium text-primary-strong disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setShowReset(false)} className="text-xs text-muted">
              Cancel
            </button>
          </div>
        )}
        {resetError && <p className="text-xs text-danger mt-1">{resetError}</p>}
      </td>
    </tr>
  );
}

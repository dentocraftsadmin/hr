"use client";

import { useState } from "react";

type Option = { id: string; name: string };

export function Reports({
  employees,
  departments,
  offices,
}: {
  employees: Option[];
  departments: Option[];
  offices: Option[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [officeId, setOfficeId] = useState("");

  function hrefFor(path: string, includeDepartmentOffice = true) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (employeeId) params.set("employeeId", employeeId);
    if (includeDepartmentOffice) {
      if (departmentId) params.set("departmentId", departmentId);
      if (officeId) params.set("officeId", officeId);
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }

  const filteredExports = [
    { label: "Attendance (punches, late marks, hours)", path: "/api/exports/attendance" },
    { label: "Points / disciplinary history", path: "/api/exports/points" },
    { label: "Leave requests", path: "/api/exports/leave" },
    { label: "Employees", path: "/api/exports/employees" },
  ];
  const wholeDatasetExports = [
    { label: "Shifts", path: "/api/exports/shifts" },
    { label: "Offices", path: "/api/exports/offices" },
    { label: "Holidays", path: "/api/exports/holidays" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground mb-1">Reports</h1>
        <p className="text-sm text-muted">
          Every export is generated from the underlying records with these filters applied — not just what&rsquo;s on
          screen. Leave a filter blank to include everything.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 grid grid-cols-2 gap-3">
        <label className="text-sm text-muted">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="text-sm text-muted">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="text-sm text-muted">
          Employee
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          Department
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted col-span-2">
          Office
          <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="">All</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-2">Filtered exports</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {filteredExports.map((item) => (
            <li key={item.path} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{item.label}</span>
              <a href={hrefFor(item.path)} className="text-xs font-medium text-primary-strong underline">
                Download .xlsx
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-2">Full datasets</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {wholeDatasetExports.map((item) => (
            <li key={item.path} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{item.label}</span>
              <a href={item.path} className="text-xs font-medium text-primary-strong underline">
                Download .xlsx
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

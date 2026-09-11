"use client";

import { useState } from "react";
import { Download, Users, Building2, Clock, MapPin, CalendarDays, ShieldCheck, PartyPopper, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";

type Option = { id: string; name: string };

const EXPORT_ICONS: Record<string, LucideIcon> = {
  "/api/exports/attendance": Clock,
  "/api/exports/points": ShieldCheck,
  "/api/exports/leave": CalendarDays,
  "/api/exports/employees": Users,
  "/api/exports/shifts": Clock,
  "/api/exports/offices": MapPin,
  "/api/exports/holidays": PartyPopper,
};

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
    { label: "Attendance", description: "Punches, late marks, hours worked", path: "/api/exports/attendance" },
    { label: "Compliance", description: "Points / disciplinary history", path: "/api/exports/points" },
    { label: "Leave requests", description: "All requests and their status", path: "/api/exports/leave" },
    { label: "Employees", description: "Full employee directory", path: "/api/exports/employees" },
  ];
  const wholeDatasetExports = [
    { label: "Shifts", path: "/api/exports/shifts" },
    { label: "Offices", path: "/api/exports/offices" },
    { label: "Holidays", path: "/api/exports/holidays" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 max-w-lg">
        <StatCard label="Employees" value={employees.length} icon={Users} />
        <StatCard label="Departments" value={departments.length} icon={Building2} />
        <StatCard label="Offices" value={offices.length} icon={MapPin} />
      </div>

      <div className="grid lg:grid-cols-[20rem_1fr] gap-6">
        <Card className="h-fit p-4">
          <h2 className="text-sm font-semibold text-foreground mb-1">Filters</h2>
          <p className="text-xs text-muted mb-3">Applied to attendance, compliance and leave exports below.</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="From" htmlFor="r-from">
                <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To" htmlFor="r-to">
                <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
            <Field label="Employee" htmlFor="r-employee">
              <Select id="r-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">All</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Department" htmlFor="r-department">
              <Select id="r-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Office" htmlFor="r-office">
              <Select id="r-office" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                <option value="">All</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Filtered exports</h2>
            <Card className="divide-y divide-border overflow-hidden">
              {filteredExports.map((item) => {
                const Icon = EXPORT_ICONS[item.path] ?? Download;
                return (
                  <a
                    key={item.path}
                    href={hrefFor(item.path)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken transition-colors"
                  >
                    <div className="rounded-lg bg-primary-soft p-2">
                      <Icon className="h-4 w-4 text-primary-strong" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted">{item.description}</p>
                    </div>
                    <Download className="h-4 w-4 text-muted-soft shrink-0" />
                  </a>
                );
              })}
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Full datasets</h2>
            <p className="text-xs text-muted mb-2">Small enough to export in full, filters don&rsquo;t apply.</p>
            <Card className="divide-y divide-border overflow-hidden">
              {wholeDatasetExports.map((item) => {
                const Icon = EXPORT_ICONS[item.path] ?? Download;
                return (
                  <a key={item.path} href={item.path} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken transition-colors">
                    <div className="rounded-lg bg-surface-sunken p-2">
                      <Icon className="h-4 w-4 text-muted" />
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                    <Download className="h-4 w-4 text-muted-soft shrink-0" />
                  </a>
                );
              })}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

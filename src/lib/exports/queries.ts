import type { SupabaseClient } from "@supabase/supabase-js";

export type ExportFilters = {
  from?: string;
  to?: string;
  employeeId?: string;
  departmentId?: string;
  officeId?: string;
  status?: string;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function fetchEmployeesForExport(supabase: SupabaseClient, filters: ExportFilters) {
  let query = supabase
    .from("employees")
    .select(
      "full_name, phone, birth_year, joining_date, leaving_date, employment_status, department:departments(name), designation:designations(name), shift:shifts(name), employee_offices(office:offices(name))"
    )
    .order("full_name");
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.status) query = query.eq("employment_status", filters.status);
  const { data } = await query;

  return (data ?? []).map((e) => ({
    name: e.full_name,
    phone: e.phone,
    birthYear: e.birth_year,
    department: one(e.department)?.name ?? "",
    designation: one(e.designation)?.name ?? "",
    shift: one(e.shift)?.name ?? "",
    office: one(one(e.employee_offices)?.office ?? null)?.name ?? "",
    status: e.employment_status,
    joiningDate: e.joining_date,
    leavingDate: e.leaving_date ?? "",
  }));
}

export async function fetchAttendanceForExport(supabase: SupabaseClient, filters: ExportFilters) {
  let query = supabase
    .from("attendance_days")
    .select(
      `date, day_type, is_late, hours_worked, location_status,
       employee:employees(full_name, department_id),
       office:offices(name), shift:shifts(name),
       punch_in:attendance_events!attendance_days_punch_in_event_id_fkey(server_recorded_at),
       punch_out:attendance_events!attendance_days_punch_out_event_id_fkey(server_recorded_at)`
    )
    .order("date", { ascending: false });

  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.officeId) query = query.eq("office_id", filters.officeId);
  if (filters.status) query = query.eq("day_type", filters.status);

  const { data } = await query;
  return (data ?? [])
    .filter((d) => !filters.departmentId || one(d.employee)?.department_id === filters.departmentId)
    .map((d) => ({
      employee: one(d.employee)?.full_name ?? "",
      date: d.date,
      punchIn: one(d.punch_in)?.server_recorded_at ?? "",
      punchOut: one(d.punch_out)?.server_recorded_at ?? "",
      hoursWorked: d.hours_worked ?? "",
      dayType: d.day_type,
      late: d.is_late ? "Yes" : "No",
      locationStatus: d.location_status,
      office: one(d.office)?.name ?? "",
      shift: one(d.shift)?.name ?? "",
    }));
}

export async function fetchPointsForExport(supabase: SupabaseClient, filters: ExportFilters) {
  let query = supabase
    .from("points_ledger")
    .select("created_at, points, reason, is_override, employee:employees(full_name), point_rule:point_rules(code)")
    .order("created_at", { ascending: false });
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data } = await query;
  return (data ?? []).map((p) => ({
    employee: one(p.employee)?.full_name ?? "",
    date: p.created_at,
    points: p.points,
    rule: one(p.point_rule)?.code ?? (p.is_override ? "MANUAL_ADJUSTMENT" : ""),
    reason: p.reason,
    manual: p.is_override ? "Yes" : "No",
  }));
}

export async function fetchLeaveForExport(supabase: SupabaseClient, filters: ExportFilters) {
  let query = supabase
    .from("leave_requests")
    .select(
      "created_at, from_date, to_date, is_half_day, status, reason, admin_note, employee:employees(full_name), leave_type:leave_types(name)"
    )
    .order("from_date", { ascending: false });
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("from_date", filters.from);
  if (filters.to) query = query.lte("to_date", filters.to);

  const { data } = await query;
  return (data ?? []).map((l) => ({
    employee: one(l.employee)?.full_name ?? "",
    leaveType: one(l.leave_type)?.name ?? "",
    fromDate: l.from_date,
    toDate: l.to_date,
    halfDay: l.is_half_day ? "Yes" : "No",
    status: l.status,
    reason: l.reason ?? "",
    adminNote: l.admin_note ?? "",
    appliedAt: l.created_at,
  }));
}

export async function fetchHolidaysForExport(supabase: SupabaseClient) {
  const { data } = await supabase.from("holidays").select("name, date, office:offices(name)").order("date");
  return (data ?? []).map((h) => ({ name: h.name, date: h.date, office: one(h.office)?.name ?? "All offices" }));
}

export async function fetchShiftsForExport(supabase: SupabaseClient) {
  const { data } = await supabase.from("shifts").select("*").order("name");
  return (data ?? []).map((s) => ({
    name: s.name,
    startTime: s.start_time,
    endTime: s.end_time,
    workingDays: (s.working_days ?? []).join(","),
    lateBufferMinutes: s.late_buffer_minutes,
    active: s.is_active ? "Yes" : "No",
  }));
}

export async function fetchOfficesForExport(supabase: SupabaseClient) {
  const { data } = await supabase.from("offices").select("*, default_shift:shifts(name)").order("name");
  return (data ?? []).map((o) => ({
    name: o.name,
    code: o.code ?? "",
    address: o.address ?? "",
    latitude: o.latitude,
    longitude: o.longitude,
    radiusMeters: o.radius_meters,
    defaultShift: one(o.default_shift)?.name ?? "",
    active: o.is_active ? "Yes" : "No",
  }));
}

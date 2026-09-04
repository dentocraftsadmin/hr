import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data/require-admin";
import { buildXlsxResponse } from "@/lib/exports/excel";
import { fetchAttendanceForExport } from "@/lib/exports/queries";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const rows = await fetchAttendanceForExport(admin.supabase, {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    employeeId: params.get("employeeId") ?? undefined,
    departmentId: params.get("departmentId") ?? undefined,
    officeId: params.get("officeId") ?? undefined,
    status: params.get("status") ?? undefined,
  });

  return buildXlsxResponse(
    "attendance.xlsx",
    "Attendance",
    [
      { header: "Employee", key: "employee", width: 24 },
      { header: "Date", key: "date", width: 14 },
      { header: "Punch In", key: "punchIn", width: 22 },
      { header: "Punch Out", key: "punchOut", width: 22 },
      { header: "Hours Worked", key: "hoursWorked", width: 14 },
      { header: "Day Type", key: "dayType", width: 14 },
      { header: "Late", key: "late", width: 8 },
      { header: "Location", key: "locationStatus", width: 16 },
      { header: "Office", key: "office", width: 18 },
      { header: "Shift", key: "shift", width: 14 },
    ],
    rows
  );
}

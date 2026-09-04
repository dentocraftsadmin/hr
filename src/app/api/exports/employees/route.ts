import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data/require-admin";
import { buildXlsxResponse } from "@/lib/exports/excel";
import { fetchEmployeesForExport } from "@/lib/exports/queries";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const rows = await fetchEmployeesForExport(admin.supabase, {
    departmentId: params.get("departmentId") ?? undefined,
    status: params.get("status") ?? undefined,
  });

  return buildXlsxResponse(
    "employees.xlsx",
    "Employees",
    [
      { header: "Name", key: "name", width: 24 },
      { header: "Phone", key: "phone", width: 14 },
      { header: "Birth Year", key: "birthYear", width: 12 },
      { header: "Department", key: "department", width: 18 },
      { header: "Designation", key: "designation", width: 18 },
      { header: "Shift", key: "shift", width: 14 },
      { header: "Office", key: "office", width: 18 },
      { header: "Status", key: "status", width: 12 },
      { header: "Joining Date", key: "joiningDate", width: 14 },
      { header: "Leaving Date", key: "leavingDate", width: 14 },
    ],
    rows
  );
}

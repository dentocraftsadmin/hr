import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data/require-admin";
import { buildXlsxResponse } from "@/lib/exports/excel";
import { fetchLeaveForExport } from "@/lib/exports/queries";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const rows = await fetchLeaveForExport(admin.supabase, {
    employeeId: params.get("employeeId") ?? undefined,
    status: params.get("status") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });

  return buildXlsxResponse(
    "leave.xlsx",
    "Leave",
    [
      { header: "Employee", key: "employee", width: 24 },
      { header: "Leave Type", key: "leaveType", width: 14 },
      { header: "From", key: "fromDate", width: 14 },
      { header: "To", key: "toDate", width: 14 },
      { header: "Half Day", key: "halfDay", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Reason", key: "reason", width: 30 },
      { header: "HR Note", key: "adminNote", width: 30 },
      { header: "Applied At", key: "appliedAt", width: 22 },
    ],
    rows
  );
}

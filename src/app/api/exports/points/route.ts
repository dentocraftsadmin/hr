import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data/require-admin";
import { buildXlsxResponse } from "@/lib/exports/excel";
import { fetchPointsForExport } from "@/lib/exports/queries";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const rows = await fetchPointsForExport(admin.supabase, {
    employeeId: params.get("employeeId") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });

  return buildXlsxResponse(
    "points-history.xlsx",
    "Points",
    [
      { header: "Employee", key: "employee", width: 24 },
      { header: "Date", key: "date", width: 22 },
      { header: "Points", key: "points", width: 10 },
      { header: "Rule", key: "rule", width: 20 },
      { header: "Reason", key: "reason", width: 36 },
      { header: "Manual Adjustment", key: "manual", width: 16 },
    ],
    rows
  );
}

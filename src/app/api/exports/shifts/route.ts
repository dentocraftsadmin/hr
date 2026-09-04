import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data/require-admin";
import { buildXlsxResponse } from "@/lib/exports/excel";
import { fetchShiftsForExport } from "@/lib/exports/queries";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const rows = await fetchShiftsForExport(admin.supabase);
  return buildXlsxResponse(
    "shifts.xlsx",
    "Shifts",
    [
      { header: "Name", key: "name", width: 20 },
      { header: "Start", key: "startTime", width: 10 },
      { header: "End", key: "endTime", width: 10 },
      { header: "Working Days (0=Sun)", key: "workingDays", width: 20 },
      { header: "Late Buffer (min)", key: "lateBufferMinutes", width: 16 },
      { header: "Active", key: "active", width: 10 },
    ],
    rows
  );
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data/require-admin";
import { buildXlsxResponse } from "@/lib/exports/excel";
import { fetchHolidaysForExport } from "@/lib/exports/queries";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const rows = await fetchHolidaysForExport(admin.supabase);
  return buildXlsxResponse(
    "holidays.xlsx",
    "Holidays",
    [
      { header: "Name", key: "name", width: 26 },
      { header: "Date", key: "date", width: 14 },
      { header: "Office", key: "office", width: 20 },
    ],
    rows
  );
}

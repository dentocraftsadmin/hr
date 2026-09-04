import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data/require-admin";
import { buildXlsxResponse } from "@/lib/exports/excel";
import { fetchOfficesForExport } from "@/lib/exports/queries";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 });

  const rows = await fetchOfficesForExport(admin.supabase);
  return buildXlsxResponse(
    "offices.xlsx",
    "Offices",
    [
      { header: "Name", key: "name", width: 20 },
      { header: "Code", key: "code", width: 10 },
      { header: "Address", key: "address", width: 30 },
      { header: "Latitude", key: "latitude", width: 12 },
      { header: "Longitude", key: "longitude", width: 12 },
      { header: "Radius (m)", key: "radiusMeters", width: 12 },
      { header: "Default Shift", key: "defaultShift", width: 16 },
      { header: "Active", key: "active", width: 10 },
    ],
    rows
  );
}

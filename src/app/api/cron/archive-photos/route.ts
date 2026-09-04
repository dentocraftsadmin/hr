import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { runPhotoArchive } from "@/lib/archive/run";

/** Runs monthly (vercel.json), archiving the month that just closed. Accepts
 * an optional ?month=YYYY-MM-01 for a manual re-run of a specific month. */
export async function GET(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const requested = request.nextUrl.searchParams.get("month");
  let periodMonth = requested;
  if (!periodMonth) {
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    periodMonth = lastMonth.toISOString().slice(0, 10);
  }

  const result = await runPhotoArchive(periodMonth);
  return NextResponse.json({ periodMonth, ...result });
}

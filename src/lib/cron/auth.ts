import { NextRequest, NextResponse } from "next/server";

/** Every /api/cron/* route calls this first. Vercel Cron sends this header
 * automatically once CRON_SECRET is set in the project's env vars — without
 * it, anyone who found the URL could trigger these jobs on demand. */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience, type AudienceInput } from "@/lib/data/notification-audience";
import { deliverBroadcast } from "@/server/actions/notification-broadcasts";

function audienceFromRow(row: {
  audience_type: string;
  department_id: string | null;
  office_id: string | null;
  employee_id: string | null;
}): AudienceInput | null {
  switch (row.audience_type) {
    case "everyone":
      return { type: "everyone" };
    case "department":
      return row.department_id ? { type: "department", departmentId: row.department_id } : null;
    case "office":
      return row.office_id ? { type: "office", officeId: row.office_id } : null;
    case "department_office":
      return row.department_id && row.office_id
        ? { type: "department_office", departmentId: row.department_id, officeId: row.office_id }
        : null;
    case "individual":
      return row.employee_id ? { type: "individual", employeeId: row.employee_id } : null;
    default:
      return null;
  }
}

/** Runs every ~5 minutes (Supabase pg_cron -> pg_net -> here), same pattern
 * as /api/cron/send-reminders. Audience is re-resolved at send time rather
 * than trusting the count shown when HR scheduled it — department/office
 * membership can change in the meantime, and re-resolving is the more
 * correct behavior for a scheduled send. */
export async function GET(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("notification_broadcasts")
    .select("id, message, audience_type, department_id, office_id, employee_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso);

  let processed = 0;
  for (const row of due ?? []) {
    // Optimistic claim, same pattern already used for photo_archive_jobs —
    // fine for a 5-minute sweep, not a real lock. If this update affects no
    // rows, another invocation already claimed it.
    const { data: claimed } = await admin
      .from("notification_broadcasts")
      .update({ status: "sending" })
      .eq("id", row.id)
      .eq("status", "scheduled")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const audience = audienceFromRow(row);
    if (!audience) {
      await admin.from("notification_broadcasts").update({ status: "failed" }).eq("id", row.id);
      continue;
    }

    const recipients = await resolveAudience(audience);
    if (recipients.length === 0) {
      await admin.from("notification_broadcasts").update({ status: "failed", sent_at: nowIso }).eq("id", row.id);
      continue;
    }

    await deliverBroadcast(row.id, row.message, recipients);
    processed += 1;
  }

  return NextResponse.json({ processed });
}

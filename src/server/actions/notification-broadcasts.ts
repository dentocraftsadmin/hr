"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience, type AudienceInput, type AudienceMember } from "@/lib/data/notification-audience";
import { sendPushToEmployee, sendPushToProfile } from "@/lib/notifications/send";
import { zonedTimeToUtc } from "@/lib/notifications/timezone";
import { broadcastFormSchema } from "@/lib/validation/notification-broadcasts";
import type { ActionResult } from "./auth";

function audienceFromForm(data: {
  audience_type: "everyone" | "department" | "office" | "department_office" | "individual";
  department_id?: string;
  office_id?: string;
  employee_id?: string;
}): AudienceInput {
  switch (data.audience_type) {
    case "everyone":
      return { type: "everyone" };
    case "department":
      return { type: "department", departmentId: data.department_id! };
    case "office":
      return { type: "office", officeId: data.office_id! };
    case "department_office":
      return { type: "department_office", departmentId: data.department_id!, officeId: data.office_id! };
    case "individual":
      return { type: "individual", employeeId: data.employee_id! };
  }
}

/** Recipient count for the confirmation screen — always recomputed
 * server-side from the audience description, never accepted from the
 * client as a number. */
export async function previewAudienceCount(
  input: AudienceInput
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };
  const recipients = await resolveAudience(input);
  return { ok: true, count: recipients.length };
}

/** Actually delivers a broadcast to its recipients and logs one outcome row
 * per employee. Shared by the immediate-send path and the scheduled-sweep
 * cron route so there is exactly one place that decides what "sent" means. */
export async function deliverBroadcast(broadcastId: string, message: string, recipients: AudienceMember[]): Promise<void> {
  const svc = createAdminClient();
  let sentCount = 0;

  for (const recipient of recipients) {
    const result = await sendPushToEmployee(recipient.id, { title: "CraftsHR", body: message, url: "/dashboard" });
    let status: "sent" | "failed" | "skipped_no_subscription";
    if (result.attempted === 0) status = "skipped_no_subscription";
    else if (result.sent > 0) status = "sent";
    else status = "failed";

    if (status === "sent") sentCount += 1;

    await svc.from("notification_broadcast_recipients").insert({
      broadcast_id: broadcastId,
      employee_id: recipient.id,
      status,
      error: status === "failed" ? "Push service rejected every subscription for this employee." : null,
    });
  }

  // "sent" here means the push service accepted at least one request for at
  // least one recipient — never a claim that anyone actually saw it. If
  // nobody received anything (all failed, or nobody had a subscription at
  // all), that's "failed", not "sent".
  const finalStatus = sentCount > 0 ? "sent" : "failed";
  await svc
    .from("notification_broadcasts")
    .update({ status: finalStatus, sent_at: new Date().toISOString(), recipient_count: recipients.length })
    .eq("id", broadcastId);
}

export async function sendBroadcast(formData: FormData): Promise<ActionResult & { id?: string }> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const parsed = broadcastFormSchema.safeParse({
    message: formData.get("message"),
    audience_type: formData.get("audience_type"),
    department_id: formData.get("department_id") ?? "",
    office_id: formData.get("office_id") ?? "",
    employee_id: formData.get("employee_id") ?? "",
    send_now: formData.get("send_now"),
    scheduled_local: formData.get("scheduled_local") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const audience = audienceFromForm(data);
  const recipients = await resolveAudience(audience);
  if (recipients.length === 0) {
    return { ok: false, error: "No active employees match this audience." };
  }

  const svc = createAdminClient();
  const sendNow = data.send_now === "true";

  let scheduledAt = new Date();
  if (!sendNow) {
    const { data: settings } = await svc.from("app_settings").select("timezone").eq("id", 1).single();
    scheduledAt = zonedTimeToUtc(data.scheduled_local!, settings?.timezone ?? "Asia/Kolkata");
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      return { ok: false, error: "The scheduled time has already passed. Pick a time in the future." };
    }
  }

  const { data: broadcast, error: insertError } = await svc
    .from("notification_broadcasts")
    .insert({
      created_by: admin.authId,
      message: data.message,
      audience_type: audience.type,
      department_id: "departmentId" in audience ? audience.departmentId : null,
      office_id: "officeId" in audience ? audience.officeId : null,
      employee_id: audience.type === "individual" ? audience.employeeId : null,
      recipient_count: recipients.length,
      scheduled_at: scheduledAt.toISOString(),
      status: sendNow ? "sending" : "scheduled",
    })
    .select("id")
    .single();

  if (insertError || !broadcast) return { ok: false, error: "Could not create the notification." };

  if (sendNow) {
    await deliverBroadcast(broadcast.id, data.message, recipients);
  }

  revalidatePath("/admin/notifications");
  return { ok: true, id: broadcast.id };
}

/** HR sending a test push to themselves (admin-only account, subscribed via
 * profile_id) or to one selected employee, to make troubleshooting easy —
 * goes through the exact same push infrastructure as a real broadcast. */
export async function sendTestNotification(input: { toSelf: true } | { employeeId: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const payload = { title: "CraftsHR", body: "CraftsHR test notification" };

  if ("toSelf" in input) {
    const employeeResult = await sendPushToProfile(admin.authId, payload);
    const profileSub = employeeResult.attempted > 0;
    // An admin might also be linked to an employee record -- try that too
    // so "send to myself" works regardless of which kind of account this is.
    const { data: profile } = await admin.supabase.from("profiles").select("employee_id").eq("id", admin.authId).single();
    let employeeSub = false;
    if (profile?.employee_id) {
      const r = await sendPushToEmployee(profile.employee_id, payload);
      employeeSub = r.attempted > 0;
    }
    if (!profileSub && !employeeSub) {
      return { ok: false, error: "You don't have notifications enabled yet — turn them on first." };
    }
    return { ok: true };
  }

  const result = await sendPushToEmployee(input.employeeId, payload);
  if (result.attempted === 0) {
    return { ok: false, error: "This employee doesn't have notifications enabled." };
  }
  if (result.sent === 0) {
    return { ok: false, error: "The test notification could not be delivered to any of this employee's devices." };
  }
  return { ok: true };
}

export async function listNotificationHistory(): Promise<
  {
    id: string;
    message: string;
    audience_type: string;
    department_id: string | null;
    office_id: string | null;
    employee_id: string | null;
    recipient_count: number;
    scheduled_at: string;
    sent_at: string | null;
    status: string;
    created_at: string;
  }[]
> {
  const admin = await requireAdmin();
  if (!admin.ok) return [];
  const { data } = await admin.supabase
    .from("notification_broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

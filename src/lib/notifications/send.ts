import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export type SendResult = { attempted: number; sent: number; failed: number };

/** Sends to every subscription an employee has (they may have more than one
 * device). A 404/410 from the push service means the browser unsubscribed
 * without telling us — clean that row up rather than retrying it forever.
 * Never throws: a failure here must never block attendance or registration,
 * so every error is caught and folded into the returned counts instead. */
export async function sendPushToEmployee(
  employeeId: string,
  payload: { title: string; body: string; url?: string }
): Promise<SendResult> {
  ensureConfigured();
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("employee_id", employeeId);

  let sent = 0;
  let failed = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload)
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return { attempted: (subs ?? []).length, sent, failed };
}

/** Same idea, but for a subscription owned directly by a profile (an
 * admin-only account with no employee row) rather than an employee. */
export async function sendPushToProfile(
  profileId: string,
  payload: { title: string; body: string; url?: string }
): Promise<SendResult> {
  ensureConfigured();
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("profile_id", profileId);

  let sent = 0;
  let failed = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload)
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return { attempted: (subs ?? []).length, sent, failed };
}

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

/** Sends to every subscription an employee has (they may have more than one
 * device). A 404/410 from the push service means the browser unsubscribed
 * without telling us — clean that row up rather than retrying it forever. */
export async function sendPushToEmployee(
  employeeId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  ensureConfigured();
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("employee_id", employeeId);

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload)
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}
